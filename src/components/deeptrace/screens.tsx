import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Archive, ArrowRight, BrainCircuit, BriefcaseBusiness, FileSearch, FileText,
  LockKeyhole, Mail, Network, Shield, ShieldAlert, TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { createRecordCode, humanize } from "@/lib/deeptrace";
import {
  DataState, EmptyAction, PageHeading, RecordTable, valueOf, useWorkspaceRows,
} from "@/components/deeptrace/workspace";
import { useDeepTraceSession, WorkspaceGate } from "@/components/deeptrace/app-shell";

/* ============= Command Center ============= */

export function CommandCenterScreen() {
  const cases = useWorkspaceRows("cases");
  const evidence = useWorkspaceRows("evidence");
  const findings = useWorkspaceRows("findings");
  const campaigns = useWorkspaceRows("campaigns");

  return (
    <WorkspaceGate>
      <section className="page-enter">
        <PageHeading
          eyebrow="COMMAND CENTER"
          title="Command Center"
          description="Live counts of records your organization can access. Analysis, correlation, and detection run in later phases — this view never invents values."
        />
        <div className="kpi-grid">
          <KpiCard to="/cases" loading={cases.loading} count={cases.records.length} label="INVESTIGATIONS" hint="Cases visible to your role" />
          <KpiCard to="/evidence" loading={evidence.loading} count={evidence.records.length} label="EVIDENCE RECORDS" hint="Submitted, unprocessed items" />
          <KpiCard to="/findings" loading={findings.loading} count={findings.records.length} label="FINDINGS" hint="Draft and reviewed findings" />
          <KpiCard to="/campaigns" loading={campaigns.loading} count={campaigns.records.length} label="CAMPAIGNS" hint="Assessments on record" />
        </div>
        <section className="section-block">
          <div className="section-title-row"><div><p className="section-label">QUICK ACTIONS</p><h2>Start where the evidence is</h2></div></div>
          <div className="quick-grid">
            <QuickCard to="/cases/new" icon={BriefcaseBusiness} title="New investigation" text="Open a case, then attach evidence to it." />
            <QuickCard to="/evidence" icon={Archive} title="Evidence Vault" text="Review submitted evidence and its provenance." />
            <QuickCard to="/graph" icon={Network} title="Threat Graph" description="Explore relationships on a labelled demo graph." />
          </div>
        </section>
        <section className="section-block">
          <div className="section-title-row">
            <div><p className="section-label">RECENT INVESTIGATIONS</p><h2>Latest cases in this workspace</h2></div>
            <Button variant="outline" size="sm" asChild><Link to="/cases">View all<ArrowRight size={14} /></Link></Button>
          </div>
          <DataState loading={cases.loading} error={cases.error} empty={!cases.records.length}>
            <RecordTable records={cases.records.slice(0, 5)} kind="cases" />
          </DataState>
        </section>
      </section>
    </WorkspaceGate>
  );
}

function KpiCard({ to, loading, count, label, hint }: { to: string; loading: boolean; count: number; label: string; hint: string }) {
  return (
    <Link to={to} className="kpi-card">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{loading ? <span className="loading-mark" /> : count}</span>
      <span className="kpi-hint">{hint}</span>
    </Link>
  );
}

function QuickCard({ to, icon: Icon, title, text }: { to: string; icon: typeof Network; title: string; text: string }) {
  return (
    <Link to={to} className="quick-card">
      <Icon size={18} strokeWidth={1.8} />
      <span><strong>{title}</strong><small>{text}</small></span>
    </Link>
  );
}

/* ============= Cases list ============= */

export function CaseListScreen({ q, onQuery }: { q: string; onQuery: (value: string) => void }) {
  const query = useWorkspaceRows("cases");
  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? query.records.filter((record) =>
        ["case_code", "title", "description", "status", "severity"]
          .some((key) => String(record[key] ?? "").toLowerCase().includes(needle)))
    : query.records;

  return (
    <WorkspaceGate>
      <section className="page-enter">
        <PageHeading
          eyebrow="INVESTIGATIONS"
          title="Cases"
          description="Investigations belonging to your organization, newest first."
          action={<EmptyAction to="/cases/new" label="New investigation" />}
        />
        <section className="section-block">
          <div className="section-title-row">
            <div><p className="section-label">CASE REGISTER</p><h2>{filtered.length} investigation{filtered.length === 1 ? "" : "s"}</h2></div>
          </div>
          <div className="case-filter">
            <Input
              aria-label="Search investigations"
              placeholder="Search by case code, title, status, or severity…"
              value={q}
              onChange={(event) => onQuery(event.target.value)}
            />
          </div>
          <DataState loading={query.loading} error={query.error} empty={!filtered.length}>
            <RecordTable records={filtered} kind="cases" />
          </DataState>
        </section>
      </section>
    </WorkspaceGate>
  );
}

/* ============= New investigation ============= */

const SEVERITIES = ["low", "medium", "high", "critical"] as const;

export function NewCaseScreen() {
  const session = useDeepTraceSession();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>("medium");
  const [priority, setPriority] = useState("3");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);

  const role = session.identity?.role ?? null;
  const canCreate = session.status === "signed-in" && role !== null && role !== "viewer";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate || !session.user || !session.identity || busy) return;
    setBusy(true);
    const { data, error } = await supabase.from("cases").insert({
      case_code: createRecordCode("CASE"),
      title: title.trim(),
      description: description.trim(),
      severity,
      priority: Number(priority),
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      organization_id: session.identity!.organizationId,
      created_by: session.user.id,
    }).select("id").single();
    setBusy(false);
    if (error) {
      toast.error("Investigation could not be created.", { description: error.message });
      return;
    }
    toast.success("Investigation created.", { description: "Evidence can be attached from the case workspace." });
    await navigate({ to: "/cases/$caseId", params: { caseId: data.id } });
  }

  return (
    <WorkspaceGate>
      <section className="page-enter">
        <PageHeading
          eyebrow="INVESTIGATIONS"
          title="New Investigation"
          description="Register the case first. Evidence, entities, and analysis attach to the case afterwards."
        />
        {!canCreate && session.status === "signed-in" ? (
          <div className="notice-panel notice-alert"><LockKeyhole size={16} /><span>Your role ({humanize(role)}) cannot create investigations. Ask a lead analyst or administrator to open the case.</span></div>
        ) : null}
        <section className="section-block">
          <div className="section-title-row"><div><p className="section-label">CASE DETAILS</p><h2>Investigation information</h2></div></div>
          <form onSubmit={submit}>
            <div className="form-grid">
              <div className="form-field full">
                <label htmlFor="case-title">TITLE</label>
                <Input id="case-title" required maxLength={160} placeholder="e.g. Credential phishing against finance team" value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>
              <div className="form-field full">
                <label htmlFor="case-description">DESCRIPTION</label>
                <Textarea id="case-description" rows={4} placeholder="What happened, who reported it, and what is in scope." value={description} onChange={(event) => setDescription(event.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor="case-severity">SEVERITY</label>
                <select id="case-severity" className="mono-data" value={severity} onChange={(event) => setSeverity(event.target.value as (typeof SEVERITIES)[number])} style={{ padding: "8px 10px", borderRadius: 8, background: "var(--color-input)", border: "1px solid var(--color-border)", color: "var(--color-foreground)" }}>
                  {SEVERITIES.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="case-priority">PRIORITY (1–5)</label>
                <Input id="case-priority" type="number" min={1} max={5} value={priority} onChange={(event) => setPriority(event.target.value)} />
              </div>
              <div className="form-field full">
                <label htmlFor="case-tags">TAGS (COMMA-SEPARATED)</label>
                <Input id="case-tags" placeholder="phishing, finance, supplier" value={tags} onChange={(event) => setTags(event.target.value)} />
              </div>
            </div>
            <Button type="submit" disabled={!canCreate || busy || !title.trim()}>
              {busy ? "Creating…" : "Create investigation"}
            </Button>
          </form>
        </section>
      </section>
    </WorkspaceGate>
  );
}

/* ============= Case detail ============= */

const CASE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "evidence", label: "Evidence" },
  { id: "timeline", label: "Timeline" },
  { id: "audit", label: "Audit Trail" },
] as const;

export function CaseDetailScreen({ caseId }: { caseId: string }) {
  const [tab, setTab] = useState<(typeof CASE_TABS)[number]["id"]>("overview");
  const caseQuery = useWorkspaceRows("cases", caseId);
  const evidence = useWorkspaceRows("evidence", caseId);
  const timeline = useWorkspaceRows("timeline_events", caseId);
  const audit = useWorkspaceRows("audit_logs", caseId);

  const record = caseQuery.records[0];

  if (caseQuery.loading) {
    return <div className="state-panel"><span className="loading-mark" /><p>Loading investigation…</p></div>;
  }
  if (caseQuery.error) {
    return <div className="state-panel state-error"><ShieldAlert size={24} /><h2>Investigation unavailable</h2><p>{caseQuery.error}</p></div>;
  }
  if (!record) {
    return (
      <WorkspaceGate>
        <div className="state-panel"><Shield size={24} /><h2>Investigation not found</h2><p>This case does not exist in your workspace, or your role cannot access it.</p><Button asChild><Link to="/cases">Back to Cases</Link></Button></div>
      </WorkspaceGate>
    );
  }

  return (
    <WorkspaceGate>
      <section className="page-enter">
        <div className="page-heading">
          <div>
            <p className="eyebrow">CASE WORKSPACE · {valueOf(record, "case_code")}</p>
            <h1>{valueOf(record, "title") || "Untitled investigation"}</h1>
            <p className="page-description">
              Opened {humanize(valueOf(record, "created_at"))} · <span className={`status-pill ${valueOf(record, "severity").toLowerCase()}`}>{humanize(valueOf(record, "severity"))}</span>{" "}
              <span className={`status-pill ${valueOf(record, "status").toLowerCase().replaceAll("_", "-")}`}>{humanize(valueOf(record, "status"))}</span>
            </p>
          </div>
        </div>
        <div className="tab-row">
          {CASE_TABS.map((item) => (
            <button key={item.id} type="button" className={`tab-button ${tab === item.id ? "tab-button-active" : ""}`} onClick={() => setTab(item.id)}>{item.label}</button>
          ))}
        </div>
        <section className="section-block">
          {tab === "overview" ? <CaseOverview record={record} evidenceCount={evidence.records.length} /> : null}
          {tab === "evidence" ? (
            <>
              <DataState loading={evidence.loading} error={evidence.error} empty={!evidence.records.length}>
                <RecordTable records={evidence.records} kind="evidence" />
              </DataState>
              {!evidence.loading && !evidence.records.length ? <p className="page-description">Evidence capture from the case workspace arrives in a later update. Submitted evidence will appear here unprocessed.</p> : null}
            </>
          ) : null}
          {tab === "timeline" ? (
            <DataState loading={timeline.loading} error={timeline.error} empty={!timeline.records.length}>
              <RecordTable records={timeline.records} kind="timeline_events" />
            </DataState>
          ) : null}
          {tab === "audit" ? (
            <DataState loading={audit.loading} error={audit.error} empty={!audit.records.length}>
              <RecordTable records={audit.records} kind="audit_logs" />
            </DataState>
          ) : null}
        </section>
      </section>
    </WorkspaceGate>
  );
}

function CaseOverview({ record, evidenceCount }: { record: Record<string, unknown>; evidenceCount: number }) {
  const fields: [string, string][] = [
    ["CASE CODE", valueOf(record, "case_code")],
    ["PRIORITY", valueOf(record, "priority") ? `${valueOf(record, "priority")} / 5` : ""],
    ["ASSIGNED TO", valueOf(record, "assigned_to")],
    ["TAGS", Array.isArray(record["tags"]) && record["tags"].length ? (record["tags"] as string[]).join(", ") : ""],
    ["EVIDENCE RECORDS", String(evidenceCount)],
  ];
  return (
    <>
      <div className="detail-grid">
        {fields.map(([label, value]) => (
          <div className="detail-item" key={label}><small>{label}</small><span>{value || "—"}</span></div>
        ))}
      </div>
      <div className="detail-item" style={{ marginTop: 16 }}>
        <small>DESCRIPTION</small>
        <span>{valueOf(record, "description") || "No description recorded."}</span>
      </div>
      <div className="notice-panel" style={{ marginTop: 16 }}>
        <TriangleAlert size={16} />
        <span>Entity resolution, relationship discovery, campaign assessment, and ATT&amp;CK mapping run in later phases. Nothing on this page is auto-generated analysis.</span>
      </div>
    </>
  );
}

/* ============= Threat Graph (demonstration data) ============= */

type DemoNode = { id: string; label: string; kind: string; x: number; y: number };

const DEMO_NODES: DemoNode[] = [
  { id: "domain", label: "mailer.phish-example.net", kind: "DOMAIN", x: 90, y: 120 },
  { id: "ip", label: "203.0.113.7", kind: "IP ADDRESS", x: 220, y: 50 },
  { id: "sender", label: "billing@supplier-example.com", kind: "EMAIL", x: 220, y: 205 },
  { id: "hash", label: "9f2b…c41d", kind: "FILE HASH", x: 360, y: 130 },
  { id: "victim", label: "finance@victim-example.org", kind: "EMAIL", x: 490, y: 70 },
];

const DEMO_EDGES: [string, string][] = [
  ["domain", "ip"], ["domain", "sender"], ["sender", "hash"], ["hash", "victim"], ["ip", "hash"],
];

export function GraphScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const [needle, setNeedle] = useState("");
  const [explain, setExplain] = useState(false);

  const visible = needle
    ? DEMO_NODES.filter((node) => `${node.label} ${node.kind}`.toLowerCase().includes(needle.trim().toLowerCase()))
    : DEMO_NODES;
  const visibleIds = new Set(visible.map((node) => node.id));
  const links = DEMO_EDGES.filter(([a, b]) => visibleIds.has(a) && visibleIds.has(b));
  const node = DEMO_NODES.find((item) => item.id === selected) ?? null;
  const connected = node
    ? DEMO_NODES.filter((item) => DEMO_EDGES.some(([a, b]) => (a === node.id && b === item.id) || (b === node.id && a === item.id)))
    : [];

  return (
    <WorkspaceGate>
      <section className="page-enter">
        <PageHeading
          eyebrow="INTELLIGENCE"
          title="Threat Graph"
          description="Relationship canvas for entity links. Zooming, panning, and evidence-backed expansion arrive with live data."
        />
        <div className="notice-panel notice-alert"><TriangleAlert size={16} /><span>DEMONSTRATION DATA — this graph is illustrative sample content, not live intelligence. It is never mixed with workspace records.</span></div>
        <div className="graph-layout">
          <div className="graph-canvas">
            <div className="graph-toolbar">
              <Network size={15} />
              <input aria-label="Filter demo graph nodes" placeholder="Filter demonstration nodes…" value={needle} onChange={(event) => setNeedle(event.target.value)} />
            </div>
            <svg viewBox="0 0 580 280" role="img" aria-label="Demonstration relationship graph" style={{ width: "100%", display: "block" }}>
              {links.map(([a, b]) => {
                const from = DEMO_NODES.find((item) => item.id === a)!;
                const to = DEMO_NODES.find((item) => item.id === b)!;
                return <line key={`${a}-${b}`} className="graph-edge" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
              })}
              {visible.map((item) => (
                <g key={item.id} className={`graph-node ${selected === item.id ? "graph-node-selected" : ""}`} onClick={() => { setSelected(item.id); setExplain(false); }}>
                  <circle cx={item.x} cy={item.y} r={17} />
                  <text x={item.x} y={item.y + 32}>{item.label.length > 24 ? `${item.label.slice(0, 23)}…` : item.label}</text>
                </g>
              ))}
            </svg>
          </div>
          <aside className="graph-panel">
            <p className="section-label">SELECTION</p>
            {node ? (
              <>
                <strong>{node.label}</strong>
                <span className="panel-kind">{node.kind}</span>
                <div className="graph-connected">
                  <span>Connected entities:</span>
                  {connected.length ? connected.map((item) => <span key={item.id}>· {item.label}</span>) : <span>· none</span>}
                </div>
                <Button size="sm" variant="outline" onClick={() => setExplain((value) => !value)}>Why are these connected?</Button>
                {explain ? <p className="graph-explain">In this demonstration, links are illustrative. In the live product, this panel explains which evidence records support each relationship — and unsupported links are never asserted.</p> : null}
              </>
            ) : (
              <p className="page-description">Select a node to inspect it. Search filters the demonstration graph.</p>
            )}
          </aside>
        </div>
      </section>
    </WorkspaceGate>
  );
}

/* ============= Copilot (honest placeholder) ============= */

export function CopilotScreen() {
  return (
    <WorkspaceGate>
      <section className="page-enter">
        <PageHeading
          eyebrow="INTELLIGENCE"
          title="Investigation Copilot"
          description="Question answering grounded in retrieved case evidence."
        />
        <div className="notice-panel notice-alert"><TriangleAlert size={16} /><span>The copilot is not connected yet. Grounded answers require the evidence retrieval pipeline, which ships in a later phase. This build generates no answers and never fabricates investigation conclusions.</span></div>
        <section className="section-block copilot-shell">
          <div className="section-title-row"><div><p className="section-label">SESSION</p><h2>Ask about a case, its evidence, or a timeline</h2></div></div>
          <div className="copilot-log">Grounded answers will appear here once the retrieval pipeline is connected.</div>
          <div className="copilot-input">
            <Textarea rows={2} disabled placeholder="Ask a grounded question about a case…" aria-label="Copilot question (disabled until the pipeline is connected)" />
            <Button disabled><BrainCircuit size={15} />Ask</Button>
          </div>
        </section>
      </section>
    </WorkspaceGate>
  );
}

/* ============= Reports (honest placeholder) ============= */

const REPORT_TYPES = [
  { icon: FileText, title: "Investigation Report", description: "Full case narrative: evidence, entities, timeline, and findings." },
  { icon: Shield, title: "Campaign Intelligence", description: "Potentially coordinated campaign assessment with confidence and limitations." },
  { icon: Archive, title: "Evidence Summary", description: "Itemized evidence register with provenance and collection details." },
  { icon: FileSearch, title: "Executive Summary", description: "One-page leadership briefing for an investigation." },
];

export function ReportsScreen() {
  return (
    <WorkspaceGate>
      <section className="page-enter">
        <PageHeading
          eyebrow="REPORTING"
          title="Reports"
          description="Structured reporting over approved findings and evidence."
        />
        <div className="notice-panel"><TriangleAlert size={16} /><span>Report generation and PDF/JSON export arrive in a later phase. No report content is produced or previewed in this build.</span></div>
        <section className="section-block">
          <div className="section-title-row"><div><p className="section-label">PLANNED REPORT TYPES</p><h2>What this module will produce</h2></div></div>
          <div className="report-grid">
            {REPORT_TYPES.map((report) => (
              <div className="report-card" key={report.title}>
                <report.icon size={18} strokeWidth={1.8} />
                <strong>{report.title}</strong>
                <small>{report.description}</small>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <Button variant="outline" size="sm" asChild><Link to="/findings">Review findings<ArrowRight size={14} /></Link></Button>
          </div>
        </section>
      </section>
    </WorkspaceGate>
  );
}

/* ============= Settings ============= */

export function SettingsScreen() {
  const session = useDeepTraceSession();
  const identity = session.identity;
  return (
    <WorkspaceGate>
      <section className="page-enter">
        <PageHeading
          eyebrow="SYSTEM"
          title="Settings"
          description="Workspace identity and access model for your account."
        />
        <section className="section-block">
          <div className="section-title-row"><div><p className="section-label">WORKSPACE</p><h2>Organization and access</h2></div></div>
          <div className="settings-row"><small>ORGANIZATION</small><span>{identity?.organizationName ?? "—"}</span></div>
          <div className="settings-row"><small>YOUR ROLE</small><span>{identity ? humanize(identity.role) : "—"}</span></div>
          <div className="settings-row"><small>SIGNED IN AS</small><span>{session.user?.email ?? "—"}</span></div>
          <div className="settings-row"><small>ACCESS MODEL</small><span>Every record is filtered by organization in the database; roles are enforced server-side.</span></div>
          <div className="settings-row"><small>ROLE CHANGES</small><span>Invitations and role assignments are handled by administrators at the workspace level.</span></div>
        </section>
        <div className="notice-panel"><LockKeyhole size={16} /><span>Role administration UI arrives in a later phase. Authorization never depends on this page.</span></div>
      </section>
    </WorkspaceGate>
  );
}

/* ============= Auth ============= */

export function AuthScreen() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const navigate = useNavigate();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice(null);
    if (mode === "sign-in") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (error) { setNotice(error.message); return; }
      await navigate({ to: "/" });
      return;
    }
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (error) { setNotice(error.message); return; }
    if (data.session) {
      await navigate({ to: "/" });
    } else {
      setNotice("Account created. Check your inbox and confirm your email before signing in.");
    }
  }

  async function google() {
    setNotice(null);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (!result.redirected && result.error) {
      setNotice(result.error instanceof Error ? result.message : "Google sign-in could not be started.");
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card page-enter">
        <div className="auth-brand">
          <span className="brand-mark"><Shield size={20} /></span>
          <span><strong>DEEPTRACE</strong></span>
        </div>
        <h1>{mode === "sign-in" ? "Sign in to your workspace" : "Create your workspace account"}</h1>
        <p className="auth-sub">Investigation records are isolated per organization and role.</p>
        <form className="auth-fields" onSubmit={submit}>
          <Input type="email" required autoComplete="email" placeholder="Work email" value={email} onChange={(event) => setEmail(event.target.value)} aria-label="Email" />
          <Input type="password" required minLength={6} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} aria-label="Password" />
          <Button type="submit" disabled={busy}>{busy ? "Working…" : mode === "sign-in" ? "Sign in" : "Create account"}</Button>
        </form>
        <div className="divider-row">OR</div>
        <Button variant="outline" onClick={() => void google()} disabled={busy}><Mail size={15} />Continue with Google</Button>
        {notice ? <div className="notice-panel notice-alert"><ShieldAlert size={16} /><span>{notice}</span></div> : null}
        <p className="auth-switch">
          {mode === "sign-in" ? "No account yet? " : "Already registered? "}
          <button type="button" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setNotice(null); }}>
            {mode === "sign-in" ? "Create one" : "Sign in"}
          </button>
        </p>
        <p className="auth-note">The first account in a new organization becomes its administrator.</p>
      </div>
    </div>
  );
}
