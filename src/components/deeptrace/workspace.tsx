import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, FilePlus2, RefreshCw, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDeepTraceSession, WorkspaceGate } from "@/components/deeptrace/app-shell";
import { fetchWorkspaceRecords, formatDate, humanize, type CloudRecord, type WorkspaceTable } from "@/lib/deeptrace";

export function useWorkspaceRows(table: WorkspaceTable, caseId?: string) {
  const { identity, status } = useDeepTraceSession();
  const [records, setRecords] = useState<CloudRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    let alive = true;
    if (status !== "signed-in" || !identity) {
      setRecords([]);
      setLoading(status === "checking");
      return () => { alive = false; };
    }
    setLoading(true);
    void fetchWorkspaceRecords(table, identity.organizationId, caseId).then((rows) => {
      if (alive) { setRecords(rows); setError(null); }
    }).catch((reason: unknown) => {
      if (alive) setError(reason instanceof Error ? reason.message : "Records could not be loaded.");
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [table, caseId, identity, status, refreshKey]);
  return { records, loading, error, refresh: () => setRefreshKey((value) => value + 1) };
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{action && <div className="heading-action">{action}</div>}</div>;
}

export function DataState({ loading, error, empty, children }: { loading: boolean; error: string | null; empty: boolean; children: React.ReactNode }) {
  if (loading) return <div className="data-state"><span className="loading-mark" /><span>Loading organization records…</span></div>;
  if (error) return <div className="data-state data-error"><AlertCircle size={19} /><span>{error}</span></div>;
  if (empty) return <div className="empty-state"><span className="empty-state-icon"><SearchX size={21} /></span><strong>No records yet</strong><span>Records added to this workspace will appear here.</span></div>;
  return <>{children}</>;
}

export function RecordTable({ records, kind }: { records: CloudRecord[]; kind: "cases" | "evidence" | "campaigns" | "findings" | "attack_techniques" | "timeline_events" | "audit_logs" }) {
  const columns: Record<typeof kind, { label: string; key: string }[]> = {
    cases: [{ label: "CASE", key: "case_code" }, { label: "INVESTIGATION", key: "title" }, { label: "SEVERITY", key: "severity" }, { label: "STATUS", key: "status" }, { label: "OPENED", key: "created_at" }],
    evidence: [{ label: "RECORD", key: "evidence_code" }, { label: "TYPE", key: "type" }, { label: "SUBMITTED VALUE", key: "value" }, { label: "STATUS", key: "status" }, { label: "COLLECTED", key: "collected_at" }],
    campaigns: [{ label: "ASSESSMENT", key: "name" }, { label: "STATUS", key: "status" }, { label: "RISK", key: "risk_level" }, { label: "UPDATED", key: "updated_at" }],
    findings: [{ label: "FINDING", key: "finding_code" }, { label: "TITLE", key: "title" }, { label: "STATUS", key: "status" }, { label: "UPDATED", key: "updated_at" }],
    attack_techniques: [{ label: "TECHNIQUE", key: "technique_id" }, { label: "NAME", key: "name" }, { label: "TACTIC", key: "tactic" }, { label: "OBSERVED BEHAVIOR", key: "observed_behavior" }],
    timeline_events: [{ label: "OCCURRED", key: "occurred_at" }, { label: "EVENT", key: "event_type" }, { label: "DESCRIPTION", key: "description" }, { label: "CONFIDENCE", key: "confidence" }],
    audit_logs: [{ label: "TIME", key: "created_at" }, { label: "ACTION", key: "action" }, { label: "OBJECT", key: "object_type" }, { label: "DETAILS", key: "details" }],
  };
  return <div className="table-scroll"><table className="records-table"><thead><tr>{columns[kind].map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{records.map((record, index) => <tr key={valueOf(record, "id") || `${kind}-${index}`}>{columns[kind].map((column) => {
    const value = record[column.key];
    const caseCode = valueOf(record, "case_code");
    return <td key={column.key}>{column.key === "title" && kind === "cases" && caseCode ? <Link className="record-link" to="/cases/$caseId" params={{ caseId: valueOf(record, "id") }}>{String(value ?? "Untitled investigation")}</Link> : <RecordCell field={column.key} value={value} />}</td>;
  })}</tr>)}</tbody></table></div>;
}

function RecordCell({ field, value }: { field: string; value: unknown }) {
  if (value == null || value === "") return <span className="text-muted-foreground">—</span>;
  if (field.endsWith("_at")) return <span className="mono-data">{formatDate(value)}</span>;
  if (field === "severity" || field === "status" || field === "risk_level") return <span className={`status-pill ${String(value).toLowerCase().replaceAll("_", "-")}`}>{humanize(value)}</span>;
  if (field === "value" || field === "description" || field === "observed_behavior") return <span className="table-truncate" title={String(value)}>{String(value)}</span>;
  if (field === "details") return <span className="table-truncate" title={JSON.stringify(value)}>{JSON.stringify(value)}</span>;
  if (field === "confidence") return <span>{typeof value === "number" ? `${Math.round(value * 100)}%` : String(value)}</span>;
  return <span>{typeof value === "string" ? humanize(value) : String(value)}</span>;
}

export function valueOf(record: CloudRecord, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

export function EmptyAction({ to, label }: { to: "/cases/new"; label: string }) {
  return <Button asChild><Link to={to}><FilePlus2 size={16} />{label}<ArrowRight size={15} /></Link></Button>;
}

export function RecordsScreen({ eyebrow, title, description, table, kind, action }: { eyebrow: string; title: string; description: string; table: WorkspaceTable; kind: "evidence" | "campaigns" | "findings" | "attack_techniques" | "timeline_events" | "audit_logs"; action?: React.ReactNode }) {
  const query = useWorkspaceRows(table);
  return <WorkspaceGate><section className="page-enter"><PageHeading eyebrow={eyebrow} title={title} description={description} action={action} /><section className="section-block"><div className="section-title-row"><div><p className="section-label">WORKSPACE RECORDS</p><h2>{query.records.length} {title.toLowerCase()} entries</h2></div><Button variant="outline" size="sm" onClick={query.refresh}><RefreshCw size={14} />Refresh</Button></div><DataState loading={query.loading} error={query.error} empty={!query.records.length}><RecordTable records={query.records} kind={kind} /></DataState></section></section></WorkspaceGate>;
}