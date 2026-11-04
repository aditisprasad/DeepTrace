import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Archive,
  ArrowRight,
  BrainCircuit,
  Eye,
  EyeOff,
  FileSearch,
  FileText,
  Fingerprint,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Network,
  ScanSearch,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { createRecordCode, humanize } from "@/lib/deeptrace";
import {
  DataState,
  EmptyAction,
  PageHeading,
  RecordTable,
  valueOf,
  useWorkspaceRows,
} from "@/components/deeptrace/workspace";
import { useDeepTraceSession, WorkspaceGate } from "@/components/deeptrace/app-shell";

/* ============= Cases list ============= */

export function CaseListScreen({ q, onQuery }: { q: string; onQuery: (value: string) => void }) {
  const query = useWorkspaceRows("cases");
  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? query.records.filter((record) =>
        ["case_code", "title", "description", "status", "severity"].some((key) =>
          String(record[key] ?? "")
            .toLowerCase()
            .includes(needle),
        ),
      )
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
            <div>
              <p className="section-label">CASE REGISTER</p>
              <h2>
                {filtered.length} investigation{filtered.length === 1 ? "" : "s"}
              </h2>
            </div>
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
  const canCreate = session.status === "ready" && role !== null && role !== "viewer";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate || !session.user || !session.identity || busy) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("cases")
      .insert({
        case_code: createRecordCode("CASE"),
        title: title.trim(),
        description: description.trim(),
        severity,
        priority: Number(priority),
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        organization_id: session.identity!.organizationId,
        created_by: session.user.id,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      toast.error("Investigation could not be created.", { description: error.message });
      return;
    }
    toast.success("Investigation created.", {
      description: "Evidence can be attached from the case workspace.",
    });
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
        {!canCreate && session.status === "ready" ? (
          <div className="notice-panel notice-alert">
            <LockKeyhole size={16} />
            <span>
              Your role ({humanize(role)}) cannot create investigations. Ask a lead analyst or
              administrator to open the case.
            </span>
          </div>
        ) : null}
        <section className="section-block">
          <div className="section-title-row">
            <div>
              <p className="section-label">CASE DETAILS</p>
              <h2>Investigation information</h2>
            </div>
          </div>
          <form onSubmit={submit}>
            <div className="form-grid">
              <div className="form-field full">
                <label htmlFor="case-title">TITLE</label>
                <Input
                  id="case-title"
                  required
                  maxLength={160}
                  placeholder="e.g. Credential phishing against finance team"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
              <div className="form-field full">
                <label htmlFor="case-description">DESCRIPTION</label>
                <Textarea
                  id="case-description"
                  rows={4}
                  placeholder="What happened, who reported it, and what is in scope."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="case-severity">SEVERITY</label>
                <select
                  id="case-severity"
                  className="mono-data"
                  value={severity}
                  onChange={(event) =>
                    setSeverity(event.target.value as (typeof SEVERITIES)[number])
                  }
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "var(--color-input)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-foreground)",
                  }}
                >
                  {SEVERITIES.map((value) => (
                    <option key={value} value={value}>
                      {humanize(value)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="case-priority">PRIORITY (1–5)</label>
                <Input
                  id="case-priority"
                  type="number"
                  min={1}
                  max={5}
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                />
              </div>
              <div className="form-field full">
                <label htmlFor="case-tags">TAGS (COMMA-SEPARATED)</label>
                <Input
                  id="case-tags"
                  placeholder="phishing, finance, supplier"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                />
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
    return (
      <div className="state-panel">
        <span className="loading-mark" />
        <p>Loading investigation…</p>
      </div>
    );
  }
  if (caseQuery.error) {
    return (
      <div className="state-panel state-error">
        <ShieldAlert size={24} />
        <h2>Investigation unavailable</h2>
        <p>{caseQuery.error}</p>
      </div>
    );
  }
  if (!record) {
    return (
      <WorkspaceGate>
        <div className="state-panel">
          <Shield size={24} />
          <h2>Investigation not found</h2>
          <p>This case does not exist in your workspace, or your role cannot access it.</p>
          <Button asChild>
            <Link to="/cases">Back to Cases</Link>
          </Button>
        </div>
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
              Opened {humanize(valueOf(record, "created_at"))} ·{" "}
              <span className={`status-pill ${valueOf(record, "severity").toLowerCase()}`}>
                {humanize(valueOf(record, "severity"))}
              </span>{" "}
              <span
                className={`status-pill ${valueOf(record, "status").toLowerCase().replaceAll("_", "-")}`}
              >
                {humanize(valueOf(record, "status"))}
              </span>
            </p>
          </div>
        </div>
        <div className="tab-row">
          {CASE_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`tab-button ${tab === item.id ? "tab-button-active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <section className="section-block">
          {tab === "overview" ? (
            <CaseOverview record={record} evidenceCount={evidence.records.length} />
          ) : null}
          {tab === "evidence" ? (
            <>
              <DataState
                loading={evidence.loading}
                error={evidence.error}
                empty={!evidence.records.length}
              >
                <RecordTable records={evidence.records} kind="evidence" />
              </DataState>
              {!evidence.loading && !evidence.records.length ? (
                <p className="page-description">
                  Evidence capture from the case workspace arrives in a later update. Submitted
                  evidence will appear here unprocessed.
                </p>
              ) : null}
            </>
          ) : null}
          {tab === "timeline" ? (
            <DataState
              loading={timeline.loading}
              error={timeline.error}
              empty={!timeline.records.length}
            >
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

function CaseOverview({
  record,
  evidenceCount,
}: {
  record: Record<string, unknown>;
  evidenceCount: number;
}) {
  const fields: [string, string][] = [
    ["CASE CODE", valueOf(record, "case_code")],
    ["PRIORITY", valueOf(record, "priority") ? `${valueOf(record, "priority")} / 5` : ""],
    ["ASSIGNED TO", valueOf(record, "assigned_to")],
    [
      "TAGS",
      Array.isArray(record["tags"]) && record["tags"].length
        ? (record["tags"] as string[]).join(", ")
        : "",
    ],
    ["EVIDENCE RECORDS", String(evidenceCount)],
  ];
  return (
    <>
      <div className="detail-grid">
        {fields.map(([label, value]) => (
          <div className="detail-item" key={label}>
            <small>{label}</small>
            <span>{value || "—"}</span>
          </div>
        ))}
      </div>
      <div className="detail-item" style={{ marginTop: 16 }}>
        <small>DESCRIPTION</small>
        <span>{valueOf(record, "description") || "No description recorded."}</span>
      </div>
      <div className="notice-panel" style={{ marginTop: 16 }}>
        <TriangleAlert size={16} />
        <span>
          Entity resolution, relationship discovery, campaign assessment, and ATT&amp;CK mapping run
          in later phases. Nothing on this page is auto-generated analysis.
        </span>
      </div>
    </>
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
        <div className="notice-panel notice-alert">
          <TriangleAlert size={16} />
          <span>
            The copilot is not connected yet. Grounded answers require the evidence retrieval
            pipeline, which ships in a later phase. This build generates no answers and never
            fabricates investigation conclusions.
          </span>
        </div>
        <section className="section-block copilot-shell">
          <div className="section-title-row">
            <div>
              <p className="section-label">SESSION</p>
              <h2>Ask about a case, its evidence, or a timeline</h2>
            </div>
          </div>
          <div className="copilot-log">
            Grounded answers will appear here once the retrieval pipeline is connected.
          </div>
          <div className="copilot-input">
            <Textarea
              rows={2}
              disabled
              placeholder="Ask a grounded question about a case…"
              aria-label="Copilot question (disabled until the pipeline is connected)"
            />
            <Button disabled>
              <BrainCircuit size={15} />
              Ask
            </Button>
          </div>
        </section>
      </section>
    </WorkspaceGate>
  );
}

/* ============= Reports (honest placeholder) ============= */

const REPORT_TYPES = [
  {
    icon: FileText,
    title: "Investigation Report",
    description: "Full case narrative: evidence, entities, timeline, and findings.",
  },
  {
    icon: Shield,
    title: "Campaign Intelligence",
    description: "Potentially coordinated campaign assessment with confidence and limitations.",
  },
  {
    icon: Archive,
    title: "Evidence Summary",
    description: "Itemized evidence register with provenance and collection details.",
  },
  {
    icon: FileSearch,
    title: "Executive Summary",
    description: "One-page leadership briefing for an investigation.",
  },
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
        <div className="notice-panel">
          <TriangleAlert size={16} />
          <span>
            Report generation and PDF/JSON export arrive in a later phase. No report content is
            produced or previewed in this build.
          </span>
        </div>
        <section className="section-block">
          <div className="section-title-row">
            <div>
              <p className="section-label">PLANNED REPORT TYPES</p>
              <h2>What this module will produce</h2>
            </div>
          </div>
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
            <Button variant="outline" size="sm" asChild>
              <Link to="/findings">
                Review findings
                <ArrowRight size={14} />
              </Link>
            </Button>
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
          <div className="section-title-row">
            <div>
              <p className="section-label">WORKSPACE</p>
              <h2>Organization and access</h2>
            </div>
          </div>
          <div className="settings-row">
            <small>ORGANIZATION</small>
            <span>{identity?.organizationName ?? "—"}</span>
          </div>
          <div className="settings-row">
            <small>YOUR ROLE</small>
            <span>{identity ? humanize(identity.role) : "—"}</span>
          </div>
          <div className="settings-row">
            <small>SIGNED IN AS</small>
            <span>{session.user?.email ?? "—"}</span>
          </div>
          <div className="settings-row">
            <small>ACCESS MODEL</small>
            <span>
              Every record is filtered by organization in the database; roles are enforced
              server-side.
            </span>
          </div>
          <div className="settings-row">
            <small>ROLE CHANGES</small>
            <span>
              Invitations and role assignments are handled by administrators at the workspace level.
            </span>
          </div>
        </section>
        <div className="notice-panel">
          <LockKeyhole size={16} />
          <span>
            Role administration UI arrives in a later phase. Authorization never depends on this
            page.
          </span>
        </div>
      </section>
    </WorkspaceGate>
  );
}

/* ============= Auth ============= */

export function AuthScreen() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const navigate = useNavigate();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          setNotice(error.message);
          return;
        }
        await navigate({ to: "/" });
        return;
      }
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) {
        setNotice(error.message);
        return;
      }
      if (data.session) {
        await navigate({ to: "/" });
      } else {
        setNotice("Account created. Check your inbox and confirm your email before signing in.");
      }
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The authentication request could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (!result.redirected && result.error) {
        setNotice(result.error.message);
      }
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The authentication request could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-experience">
      <section className="auth-story" aria-labelledby="auth-story-title">
        <AuthNetwork />
        <div className="auth-story-content">
          <p className="auth-tagline">
            TRACE THE EVIDENCE <span /> UNCOVER THE CAMPAIGN
          </p>
          <div className="auth-story-copy">
            <p className="auth-kicker">
              <span className="auth-live-dot" /> INTELLIGENCE OPERATIONS / SECURE ACCESS
            </p>
            <h1 id="auth-story-title">
              Every trace tells <span>a story.</span>
            </h1>
            <p className="auth-story-description">
              Uncover hidden connections, reconstruct digital evidence, and investigate coordinated
              cybercrime campaigns with intelligence-driven analysis.
            </p>
          </div>
          <div className="auth-capabilities" aria-label="Platform capabilities">
            <div className="auth-capability">
              <Fingerprint size={16} />
              <span>Evidence Intelligence</span>
            </div>
            <div className="auth-capability">
              <Network size={16} />
              <span>PhishGraph Relationship Discovery</span>
            </div>
            <div className="auth-capability">
              <ScanSearch size={16} />
              <span>Campaign Investigation</span>
            </div>
          </div>
          <div className="auth-classification">
            <ShieldCheck size={14} /> PRIVATE INVESTIGATION WORKSPACE <span>·</span>{" "}
            ORGANIZATION-ISOLATED
          </div>
        </div>
        <div className="auth-coordinate auth-coordinate-top">
          DT / 01 <span>SECURE CHANNEL</span>
        </div>
        <div className="auth-coordinate auth-coordinate-bottom">
          SIGNAL INTEGRITY <i />
        </div>
      </section>
      <section className="auth-panel" aria-label="Account access">
        <div className="auth-panel-topline">
          <span>
            <span className="auth-live-dot" /> ENCRYPTED SESSION
          </span>
          <span>
            DEEPTRACE <b>·</b> IDENTITY
          </span>
        </div>
        <div className="auth-card page-enter">
          <div className="auth-panel-heading">
            <p className="auth-form-eyebrow">
              {mode === "sign-in" ? "INVESTIGATOR ACCESS" : "NEW INVESTIGATOR"}
            </p>
            <h2 key={mode} className="auth-mode-title">
              {mode === "sign-in" ? "Welcome back, Investigator." : "Create your access."}
            </h2>
            <p className="auth-sub">
              {mode === "sign-in"
                ? "Sign in to continue your investigations."
                : "Create an account to enter the intelligence workspace."}
            </p>
          </div>
          <form className="auth-fields" onSubmit={submit} key={`form-${mode}`}>
            <div className="auth-field">
              <label htmlFor="auth-email">WORK EMAIL</label>
              <span className="auth-input-wrap">
                <Mail size={16} aria-hidden="true" />
                <Input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@organization.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-label="Email"
                  disabled={busy}
                />
              </span>
            </div>
            <div className="auth-field">
              <label htmlFor="auth-password">PASSWORD</label>
              <span className="auth-input-wrap">
                <LockKeyhole size={16} aria-hidden="true" />
                <Input
                  id="auth-password"
                  type={passwordVisible ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-label="Password"
                  disabled={busy}
                />
                <button
                  className="auth-password-toggle"
                  type="button"
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  aria-label={passwordVisible ? "Hide password" : "Show password"}
                  aria-pressed={passwordVisible}
                  disabled={busy}
                >
                  {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </span>
            </div>
            {notice ? (
              <div
                className={`auth-feedback ${mode === "sign-up" && notice.startsWith("Account created") ? "auth-feedback-success" : ""}`}
                role={
                  mode === "sign-up" && notice.startsWith("Account created") ? "status" : "alert"
                }
              >
                <ShieldAlert size={16} />
                <span>{notice}</span>
              </div>
            ) : null}
            <Button className="auth-submit" type="submit" disabled={busy}>
              {busy ? <LoaderCircle className="auth-spinner" size={17} /> : null}
              {busy
                ? mode === "sign-in"
                  ? "Verifying credentials…"
                  : "Creating secure access…"
                : mode === "sign-in"
                  ? "Access Intelligence Workspace"
                  : "Create investigator account"}
              {!busy ? <ArrowRight size={17} /> : null}
            </Button>
          </form>
          <div className="divider-row">
            <span>OR CONTINUE WITH</span>
          </div>
          <Button
            className="auth-google"
            variant="outline"
            onClick={() => void google()}
            disabled={busy}
          >
            <span className="auth-google-mark" aria-hidden="true">
              G
            </span>
            Continue with Google
          </Button>
          <p className="auth-switch">
            {mode === "sign-in" ? "New to DeepTrace?" : "Already have investigator access?"}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "sign-in" ? "sign-up" : "sign-in");
                setNotice(null);
                setPasswordVisible(false);
              }}
              disabled={busy}
            >
              {mode === "sign-in" ? "Create account" : "Return to sign in"}
            </button>
          </p>
          <p className="auth-note">
            <Shield size={13} /> The first account in a new organization becomes its administrator.
          </p>
        </div>
        <div className="auth-panel-footer">
          <span>DEEPTRACE INTELLIGENCE SYSTEMS</span>
          <span>AUTHENTICATED ACCESS ONLY</span>
        </div>
      </section>
    </main>
  );
}

function AuthNetwork() {
  return (
    <svg
      className="auth-network"
      viewBox="0 0 900 760"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="auth-network-glow">
          <stop offset="0" stopColor="#0ed9ed" stopOpacity=".16" />
          <stop offset="1" stopColor="#0ed9ed" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="auth-network-line">
          <stop stopColor="#25ddec" stopOpacity="0" />
          <stop offset=".48" stopColor="#25ddec" stopOpacity=".72" />
          <stop offset="1" stopColor="#a084ff" stopOpacity=".12" />
        </linearGradient>
      </defs>
      <circle cx="470" cy="370" r="290" fill="url(#auth-network-glow)" />
      <g className="auth-network-orbits">
        <ellipse cx="470" cy="370" rx="340" ry="130" transform="rotate(-24 470 370)" />
        <ellipse cx="470" cy="370" rx="280" ry="205" transform="rotate(32 470 370)" />
        <ellipse cx="470" cy="370" rx="365" ry="240" transform="rotate(-55 470 370)" />
      </g>
      <g className="auth-network-paths" stroke="url(#auth-network-line)">
        <path d="M75 484 194 365 284 422 386 286 505 345 609 212 778 278" />
        <path d="M124 230 284 422 342 554 505 345 566 478 718 411 820 505" />
        <path d="M194 365 246 183 386 286 463 144 609 212 681 111" />
        <path d="M386 286 414 489 566 478 630 609 778 558" />
        <path d="M505 345 718 411 778 278 846 338" />
      </g>
      <g className="auth-network-points">
        <circle cx="75" cy="484" r="3" />
        <circle cx="124" cy="230" r="2" />
        <circle cx="194" cy="365" r="4" />
        <circle cx="246" cy="183" r="2" />
        <circle cx="284" cy="422" r="5" />
        <circle cx="342" cy="554" r="3" />
        <circle cx="386" cy="286" r="4" />
        <circle cx="414" cy="489" r="2" />
        <circle cx="463" cy="144" r="3" />
        <circle cx="505" cy="345" r="6" />
        <circle cx="566" cy="478" r="3" />
        <circle cx="609" cy="212" r="4" />
        <circle cx="630" cy="609" r="2" />
        <circle cx="681" cy="111" r="2" />
        <circle cx="718" cy="411" r="5" />
        <circle cx="778" cy="278" r="3" />
        <circle cx="778" cy="558" r="2" />
        <circle cx="846" cy="338" r="3" />
      </g>
    </svg>
  );
}
