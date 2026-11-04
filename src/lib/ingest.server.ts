// Server-only evidence ingestion helpers. Never import from client-reachable
// code — this module is blocked from client bundles by its *.server.ts name.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  capExtractionText,
  extractFromText,
  uploadCategory,
  uploadEvidenceType,
  type Observation,
} from "@/lib/extraction";

const EVIDENCE_BUCKET = "deeptrace-evidence";
const WRITE_ROLES = ["admin", "lead_analyst", "analyst"] as const;
const LEAD_ROLES = ["admin", "lead_analyst"] as const;

export type IngestArgs = {
  userId: string;
  caseId: string;
  storagePath: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
};

export type IngestResult = {
  evidenceId: string;
  evidenceCode: string;
  extractionStatus: "extracted" | "no_findings" | "unsupported" | "failed";
  entityCount: number;
};

type Db = SupabaseClient<Database>;

export function newEvidenceCode(): string {
  const fragment = crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
  return `EVD-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${fragment}`;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function requireCase(db: Db, caseId: string): Promise<{ id: string; organization_id: string }> {
  const { data, error } = await db.from("cases").select("id, organization_id").eq("id", caseId).maybeSingle();
  if (error) throw new Error("Case lookup failed. Try again.");
  if (!data) throw new Error("Case not found in your workspace, or your role cannot access it.");
  return data;
}

async function requireWriteRole(db: Db, userId: string, organizationId: string): Promise<void> {
  const { data: allowed } = await db.rpc("has_org_role", {
    _user_id: userId,
    _organization_id: organizationId,
    _roles: [...WRITE_ROLES],
  });
  if (!allowed) throw new Error("Your role cannot submit evidence to this case.");
}

async function requireLeadRole(db: Db, userId: string, organizationId: string): Promise<void> {
  const { data: allowed } = await db.rpc("has_org_role", {
    _user_id: userId,
    _organization_id: organizationId,
    _roles: [...LEAD_ROLES],
  });
  if (!allowed) throw new Error("Only administrators and lead analysts can reprocess evidence.");
}

// Persist pattern observations as case entities with provenance. One entity per
// distinct (entity_type, value); every occurrence becomes an observation.
async function persistObservations(
  db: Db,
  args: {
    organizationId: string;
    caseId: string;
    evidenceId: string;
    observations: Observation[];
    observedAt: string;
  },
): Promise<number> {
  const { organizationId, caseId, evidenceId, observations, observedAt } = args;
  if (!observations.length) return 0;

  const distinct = new Map<string, Observation>();
  for (const observation of observations) {
    const key = `${observation.entityType}:${observation.normalized}`;
    if (!distinct.has(key)) distinct.set(key, observation);
  }

  const values = [...new Set(observations.map((item) => item.normalized))];
  const entityTypes = [...new Set(observations.map((item) => item.entityType))];
  const { data: existing, error: fetchError } = await db
    .from("entities")
    .select("id, entity_type, value")
    .eq("organization_id", organizationId)
    .eq("case_id", caseId)
    .in("value", values)
    .in("entity_type", entityTypes);
  if (fetchError) throw new Error("Existing entities could not be checked.");

  const entityIdByKey = new Map<string, string>();
  const reObservedIds = new Set<string>();
  for (const row of existing ?? []) {
    const key = `${row.entity_type}:${row.value}`;
    if (distinct.has(key)) {
      entityIdByKey.set(key, row.id);
      reObservedIds.add(row.id);
    }
  }

  const missing = [...distinct.entries()].filter(([key]) => !entityIdByKey.has(key));
  if (missing.length) {
    const rows = missing.map(([key, observation]) => ({
      organization_id: organizationId,
      case_id: caseId,
      entity_type: observation.entityType,
      value: observation.normalized,
      first_observed: observedAt,
      last_observed: observedAt,
    }));
    const { data: inserted, error: insertError } = await db
      .from("entities")
      .insert(rows)
      .select("id, entity_type, value");
    if (insertError) throw new Error("Extracted entities could not be stored.");
    for (const row of inserted ?? []) entityIdByKey.set(`${row.entity_type}:${row.value}`, row.id);
  }

  for (const id of reObservedIds) {
    const { error: updateError } = await db
      .from("entities")
      .update({ last_observed: observedAt })
      .eq("id", id);
    if (updateError) throw new Error("Entity observation times could not be updated.");
  }

  const observationRows = [...distinct.entries()].map(([key, observation]) => ({
    organization_id: organizationId,
    case_id: caseId,
    entity_id: entityIdByKey.get(key)!,
    evidence_id: evidenceId,
    observed_at: observedAt,
    details: {
      original: observation.original,
      variant: observation.variant ?? null,
      start: observation.start,
      end: observation.end,
      context: observation.context,
    },
  }));
  const { error: observationError } = await db.from("entity_observations").insert(observationRows);
  if (observationError) throw new Error("Entity provenance could not be recorded.");

  return entityIdByKey.size;
}

type ExtractionOutcome = {
  extractionStatus: "extracted" | "no_findings" | "unsupported";
  status: "collected" | "needs_review";
  entityCount: number;
  notes: string;
};

async function runExtraction(
  db: Db,
  args: {
    organizationId: string;
    caseId: string;
    evidenceId: string;
    originalName: string;
    fileText: string | null;
  },
): Promise<ExtractionOutcome> {
  const category = uploadCategory(args.originalName);
  if (category !== "text" || args.fileText == null) {
    return {
      extractionStatus: "unsupported",
      status: "needs_review",
      entityCount: 0,
      notes:
        category === "text"
          ? "Text extraction skipped: file could not be read."
          : "No text extractor for this file format. Pattern extraction applies to text documents only.",
    };
  }
  const { text, capped } = capExtractionText(args.fileText);
  const { observations } = extractFromText(text);
  const entityCount = await persistObservations(db, {
    organizationId: args.organizationId,
    caseId: args.caseId,
    evidenceId: args.evidenceId,
    observations,
    observedAt: new Date().toISOString(),
  });
  return {
    extractionStatus: observations.length ? "extracted" : "no_findings",
    status: "collected",
    entityCount,
    notes: capped
      ? `Text truncated at ${text.length} characters for pattern extraction.`
      : "",
  };
}

async function finalize(
  db: Db,
  evidenceId: string,
  outcome: ExtractionOutcome,
  previousNotes: string,
): Promise<void> {
  const { error } = await db
    .from("evidence")
    .update({
      extraction_status: outcome.extractionStatus,
      status: outcome.status,
      analyst_notes: [previousNotes, outcome.notes].filter(Boolean).join("\n"),
    })
    .eq("id", evidenceId);
  if (error) throw new Error("Extraction status could not be saved.");
}

async function audit(
  db: Db,
  args: {
    userId: string;
    organizationId: string;
    caseId: string;
    evidenceId: string;
    action: string;
    details: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await db.from("audit_logs").insert({
    organization_id: args.organizationId,
    case_id: args.caseId,
    actor_id: args.userId,
    action: args.action,
    object_type: "evidence",
    object_id: args.evidenceId,
    details: args.details,
  });
  if (error) throw new Error("Audit trail entry could not be recorded.");
}

/** Create the evidence record for an already-uploaded file and run extraction. */
export async function ingestUploadedEvidence(db: Db, args: IngestArgs): Promise<IngestResult> {
  const caseRow = await requireCase(db, args.caseId);
  await requireWriteRole(db, args.userId, caseRow.organization_id);

  const { data: blob, error: downloadError } = await db.storage
    .from(EVIDENCE_BUCKET)
    .download(args.storagePath);
  if (downloadError || !blob) {
    throw new Error("The uploaded file could not be read from secure storage.");
  }
  const sha256 = await sha256Hex(new Uint8Array(await blob.arrayBuffer()));

  const code = newEvidenceCode();
  const now = new Date().toISOString();
  const { data: evidenceRow, error: insertError } = await db
    .from("evidence")
    .insert({
      organization_id: caseRow.organization_id,
      case_id: args.caseId,
      evidence_code: code,
      type: uploadEvidenceType(uploadCategory(args.originalName)),
      source: "Investigator submission",
      value: args.originalName,
      original_name: args.originalName,
      content_type: args.contentType,
      size_bytes: args.sizeBytes,
      storage_path: args.storagePath,
      sha256,
      status: "queued",
      analyst_notes: "",
      collected_at: now,
      created_by: args.userId,
    })
    .select("id")
    .single();
  if (insertError || !evidenceRow) {
    throw new Error("Evidence record could not be created.");
  }
  const evidenceId = evidenceRow.id;

  try {
    const { error: sourceError } = await db.from("evidence_sources").insert({
      organization_id: caseRow.organization_id,
      case_id: args.caseId,
      evidence_id: evidenceId,
      source_type: "manual_upload",
      source_uri: `${EVIDENCE_BUCKET}/${args.storagePath}`,
      collected_at: now,
      details: {
        original_name: args.originalName,
        content_type: args.contentType,
        size_bytes: args.sizeBytes,
      },
    });
    if (sourceError) throw new Error("Provenance record could not be created.");

    const textCategory = uploadCategory(args.originalName) === "text";
    const outcome = await runExtraction(db, {
      organizationId: caseRow.organization_id,
      caseId: args.caseId,
      evidenceId,
      originalName: args.originalName,
      fileText: textCategory ? await blob.text() : null,
    });
    await finalize(db, evidenceId, outcome, "");
    await audit(db, {
      userId: args.userId,
      organizationId: caseRow.organization_id,
      caseId: args.caseId,
      evidenceId,
      action: "evidence.ingested",
      details: {
        evidence_code: code,
        file: args.originalName,
        sha256,
        entities: outcome.entityCount,
        extraction_status: outcome.extractionStatus,
      },
    });
    return {
      evidenceId,
      evidenceCode: code,
      extractionStatus: outcome.extractionStatus,
      entityCount: outcome.entityCount,
    };
  } catch (error) {
    await db
      .from("evidence")
      .update({ extraction_status: "failed", status: "error" })
      .eq("id", evidenceId);
    throw error instanceof Error ? error : new Error("Evidence processing failed.");
  }
}

/** Re-run extraction for evidence still pending or previously failed. */
export async function reprocessEvidence(
  db: Db,
  args: { userId: string; evidenceId: string },
): Promise<IngestResult> {
  const { data: row, error: fetchError } = await db
    .from("evidence")
    .select(
      "id, organization_id, case_id, storage_path, original_name, sha256, evidence_code, extraction_status, analyst_notes",
    )
    .eq("id", args.evidenceId)
    .maybeSingle();
  if (fetchError) throw new Error("Evidence lookup failed. Try again.");
  if (!row) throw new Error("Evidence not found in your workspace.");
  if (row.extraction_status !== "pending" && row.extraction_status !== "failed") {
    throw new Error("Only pending or failed evidence can be reprocessed.");
  }
  await requireLeadRole(db, args.userId, row.organization_id);
  if (!row.storage_path) throw new Error("This record has no stored file to reprocess.");

  const { data: blob, error: downloadError } = await db.storage
    .from(EVIDENCE_BUCKET)
    .download(row.storage_path);
  if (downloadError || !blob) throw new Error("The stored file could not be read from secure storage.");

  try {
    const textCategory = uploadCategory(row.original_name ?? "") === "text";
    const outcome = await runExtraction(db, {
      organizationId: row.organization_id,
      caseId: row.case_id,
      evidenceId: row.id,
      originalName: row.original_name ?? "",
      fileText: textCategory ? await blob.text() : null,
    });
    await finalize(db, row.id, outcome, row.analyst_notes ?? "");
    await audit(db, {
      userId: args.userId,
      organizationId: row.organization_id,
      caseId: row.case_id,
      evidenceId: row.id,
      action: "evidence.reprocessed",
      details: {
        evidence_code: row.evidence_code,
        entities: outcome.entityCount,
        extraction_status: outcome.extractionStatus,
      },
    });
    return {
      evidenceId: row.id,
      evidenceCode: row.evidence_code,
      extractionStatus: outcome.extractionStatus,
      entityCount: outcome.entityCount,
    };
  } catch (error) {
    await db
      .from("evidence")
      .update({ extraction_status: "failed", status: "error" })
      .eq("id", row.id);
    throw error instanceof Error ? error : new Error("Evidence processing failed.");
  }
}
