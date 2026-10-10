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
  const builders = {
    cases: () => supabase.from("cases").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    evidence: () => supabase.from("evidence").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    entities: () => supabase.from("entities").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    relationships: () => supabase.from("relationships").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    campaigns: () => supabase.from("campaigns").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    timeline_events: () => supabase.from("timeline_events").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    findings: () => supabase.from("findings").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    attack_techniques: () => supabase.from("attack_techniques").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    audit_logs: () => supabase.from("audit_logs").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    evidence_sources: () => supabase.from("evidence_sources").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
    entity_observations: () => supabase.from("entity_observations").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
  };

  let query = builders[table]();
  if (caseId) query = query.eq("case_id", caseId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => Object.fromEntries(Object.entries(row)));
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
  return typeof record.id === "string" ? record.id : "Workspace record";
}

export function recordDetail(record: CloudRecord): string {
  for (const key of ["case_code", "evidence_code", "status", "type", "tactic", "risk_level", "occurred_at", "created_at"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return key.endsWith("_at") ? formatDate(value) : humanize(value);
  }
  return "Recorded in this workspace";
}