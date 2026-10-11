import { supabase } from "@/integrations/supabase/client";

export type WorkspaceTable =
  | "cases"
  | "evidence"
  | "entities"
  | "relationships"
  | "campaigns"
  | "timeline_events"
  | "findings"
  | "attack_techniques"
  | "audit_logs"
  | "evidence_sources"
  | "entity_observations";

export type CloudRecord = Record<string, unknown>;

export type WorkspaceIdentity = {
  organizationId: string;
  organizationName: string;
  role: string;
};

export async function fetchWorkspaceIdentity(userId: string): Promise<WorkspaceIdentity | null> {
  const { data: role, error: roleError } = await supabase
    .from("user_roles")
    .select("organization_id, role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (roleError) throw roleError;
  if (!role) return null;

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", role.organization_id)
    .single();

  if (organizationError) throw organizationError;

  return {
    organizationId: organization.id,
    organizationName: organization.name,
    role: role.role,
  };
}

export async function fetchWorkspaceRecords(
  table: WorkspaceTable,
  organizationId: string,
  caseId?: string,
): Promise<CloudRecord[]> {
  const filterCase = (rows: CloudRecord[]) => caseId ? rows.filter((row) => row["case_id"] === caseId) : rows;
  const unwrap = <T extends object>(result: { data: T[] | null; error: unknown }) => {
    if (result.error) throw result.error;
    return (result.data ?? []).map((row) => Object.fromEntries(Object.entries(row)) as CloudRecord);
  };

  switch (table) {
    case "cases": return unwrap(await supabase.from("cases").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }));
    case "evidence": return filterCase(unwrap(await supabase.from("evidence").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false })));
    case "entities": return filterCase(unwrap(await supabase.from("entities").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false })));
    case "relationships": return filterCase(unwrap(await supabase.from("relationships").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false })));
    case "campaigns": return filterCase(unwrap(await supabase.from("campaigns").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false })));
    case "timeline_events": return filterCase(unwrap(await supabase.from("timeline_events").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false })));
    case "findings": return filterCase(unwrap(await supabase.from("findings").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false})));
    case "attack_techniques": return filterCase(unwrap(await supabase.from("attack_techniques").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false })));
    case "audit_logs": return unwrap(await supabase.from("audit_logs").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }));
    case "evidence_sources": return filterCase(unwrap(await supabase.from("evidence_sources").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false })));
    case "entity_observations": return filterCase(unwrap(await supabase.from("entity_observations").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false })));
  }
}

export function formatDate(value: unknown): string {
  if (typeof value !== "string" || !value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function humanize(value: unknown): string {
  if (typeof value !== "string" || !value) return "Unspecified";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function createRecordCode(prefix: string): string {
  const fragment = crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();
  return `${prefix}-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${fragment}`;
}

export function safeFileName(fileName: string): string {
  const normalized = fileName.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized.slice(-100) || "evidence-file";
}

export function recordLabel(record: CloudRecord): string {
  for (const key of ["title", "name", "value", "description", "technique_id", "action", "event_type"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return typeof record["id"] === "string" ? record["id"] : "Workspace record";
}

export function recordDetail(record: CloudRecord): string {
  for (const key of ["case_code", "evidence_code", "status", "type", "tactic", "risk_level", "occurred_at", "created_at"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return key.endsWith("_at") ? formatDate(value) : humanize(value);
  }
  return "Recorded in this workspace";
}

export function routeHead(title: string, description: string) {
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}

export async function fetchCurrentWorkspace(table: WorkspaceTable, caseId?: string) {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Sign in to view this workspace.");
  const identity = await fetchWorkspaceIdentity(data.user.id);
  if (!identity) throw new Error("Your workspace is still being prepared.");
  const records = await fetchWorkspaceRecords(table, identity.organizationId, caseId);
  return { records, identity, userId: data.user.id };
}