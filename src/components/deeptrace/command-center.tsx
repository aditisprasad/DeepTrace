import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowUpRight,
  Archive,
  BriefcaseBusiness,
  CircleDot,
  FileCheck2,
  FileSearch,
  Network,
  Radio,
  ShieldAlert,
} from "lucide-react";
import {
  DataState,
  PageHeading,
  RecordTable,
  useWorkspaceRows,
  valueOf,
} from "@/components/deeptrace/workspace";
import { formatDate, humanize, type CloudRecord } from "@/lib/deeptrace";
import { WorkspaceGate } from "@/components/deeptrace/app-shell";

export function CommandCenterScreen() {
  const cases = useWorkspaceRows("cases");
  const evidence = useWorkspaceRows("evidence");
  const findings = useWorkspaceRows("findings");
  const campaigns = useWorkspaceRows("campaigns");
  const audit = useWorkspaceRows("audit_logs");
  const entities = useWorkspaceRows("entities");
  const loading =
    cases.loading ||
    evidence.loading ||
    findings.loading ||
    campaigns.loading ||
    audit.loading ||
    entities.loading;

  return (
    <WorkspaceGate>
      <section className="command-center page-enter">
        <PageHeading
          eyebrow="DEEPTRACE / OPERATIONS"
          title="Command Center"
          description="An operational view of the investigations, evidence, and campaign records available to your organization."
        />
        <section className="command-hero" aria-label="Illustrative infrastructure topology">
          <div className="command-hero-copy">
            <div className="hero-status">
              <span className="status-indicator" /> SECURE WORKSPACE
            </div>
            <h2>
              Trace the evidence.
              <br />
              <span>Uncover the campaign.</span>
            </h2>
            <p>One clear view across the records your team is actively investigating.</p>
            <Link to="/cases" className="hero-link">
              Open case register <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="topology-wrap">
            <svg
              className="topology-graphic"
              viewBox="0 0 640 300"
              role="img"
              aria-labelledby="topology-title topology-description"
            >
              <title id="topology-title">Illustrative digital infrastructure topology</title>
              <desc id="topology-description">
                An abstract network visualization. Connections are decorative and are not live
                geographic threat intelligence.
              </desc>
              <defs>
                <pattern id="topology-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path
                    d="M 32 0 L 0 0 0 32"
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity=".08"
                    strokeWidth=".6"
                  />
                </pattern>
                <radialGradient id="topology-glow">
                  <stop offset="0" stopColor="currentColor" stopOpacity=".18" />
                  <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="640" height="300" fill="url(#topology-grid)" />
              <ellipse cx="350" cy="150" rx="260" ry="135" fill="url(#topology-glow)" />
              <g className="topology-orbits" fill="none">
                <ellipse cx="350" cy="150" rx="238" ry="92" transform="rotate(-18 350 150)" />
                <ellipse cx="350" cy="150" rx="190" ry="120" transform="rotate(28 350 150)" />
                <path d="M96 204 C210 52 330 286 541 92" />
                <path d="M135 82 C260 249 405 38 578 220" />
              </g>
              <g className="topology-links">
                <path d="M147 147L251 92L339 174L450 82L534 156" />
                <path d="M251 92L282 218L405 240L450 82" />
                <path d="M339 174L534 156L574 227" />
              </g>
              <g className="topology-nodes">
                <circle cx="147" cy="147" r="3" />
                <circle cx="251" cy="92" r="4" />
                <circle cx="339" cy="174" r="5" />
                <circle cx="450" cy="82" r="3" />
                <circle cx="534" cy="156" r="4" />
                <circle cx="282" cy="218" r="3" />
                <circle cx="405" cy="240" r="3" />
                <circle cx="574" cy="227" r="3" />
              </g>
              <circle className="topology-pulse" cx="339" cy="174" r="12" />
            </svg>
            <div className="topology-caption">
              <span>
                <CircleDot size={11} /> Illustrative topology
              </span>
              <span>Not live geolocation or threat telemetry</span>
            </div>
          </div>
        </section>

        <div className="ops-strip" aria-label="Live workspace record counts">
          <Metric
            label="INVESTIGATIONS"
            value={cases.records.length}
            loading={loading}
            error={cases.error}
            icon={BriefcaseBusiness}
            tint="cyan"
          />
          <Metric
            label="EVIDENCE ITEMS"
            value={evidence.records.length}
            loading={loading}
            error={evidence.error}
            icon={Archive}
            tint="violet"
          />
          <Metric
            label="OBSERVED ENTITIES"
            value={entities.records.length}
            loading={loading}
            error={entities.error}
            icon={Network}
            tint="cyan"
          />
          <Metric
            label="CAMPAIGN RECORDS"
            value={campaigns.records.length}
            loading={loading}
            error={campaigns.error}
            icon={ShieldAlert}
            tint="amber"
          />
        </div>

        <div className="command-grid">
          <section className="intel-panel campaign-panel">
            <PanelHeading
              label="CAMPAIGN INTELLIGENCE"
              title="Assessment register"
              count={campaigns.records.length}
              to="/campaigns"
            />
            <DataState
              loading={campaigns.loading}
              error={campaigns.error}
              empty={!campaigns.records.length}
            >
              <div className="campaign-register">
                {campaigns.records.slice(0, 4).map((campaign) => (
                  <div className="campaign-row" key={valueOf(campaign, "id")}>
                    <span className={`campaign-mark ${valueOf(campaign, "status")}`}>
                      <Radio size={15} />
                    </span>
                    <div className="campaign-row-copy">
                      <strong>{valueOf(campaign, "name") || "Untitled assessment"}</strong>
                      <span>
                        {humanize(valueOf(campaign, "status"))} ·{" "}
                        {humanize(valueOf(campaign, "risk_level"))} risk
                      </span>
                    </div>
                    <span className="campaign-confidence mono-data">
                      {formatConfidence(campaign["confidence"])}
                    </span>
                  </div>
                ))}
              </div>
            </DataState>
            <div className="panel-footnote">
              Assessment state and confidence reflect workspace records.
            </div>
          </section>

          <section className="intel-panel activity-panel">
            <PanelHeading
              label="INVESTIGATION ACTIVITY"
              title="Audit trail"
              count={audit.records.length}
              to="/audit-log"
            />
            <DataState loading={audit.loading} error={audit.error} empty={!audit.records.length}>
              <div className="activity-feed">
                {audit.records.slice(0, 5).map((event) => (
                  <ActivityRow key={valueOf(event, "id")} event={event} />
                ))}
              </div>
            </DataState>
          </section>

          <section className="intel-panel processing-panel">
            <PanelHeading
              label="EVIDENCE PROCESSING"
              title="Ingestion status"
              count={evidence.records.length}
              to="/evidence"
            />
            <DataState
              loading={evidence.loading}
              error={evidence.error}
              empty={!evidence.records.length}
            >
              <div className="processing-summary">
                {(["pending", "extracted", "no_findings", "unsupported", "failed"] as const).map(
                  (state) => {
                    const count = evidence.records.filter(
                      (record) => record["extraction_status"] === state,
                    ).length;
                    return (
                      <div className="processing-row" key={state}>
                        <span className={`processing-dot ${state}`} />
                        <span>{humanize(state)}</span>
                        <strong className="mono-data">{count}</strong>
                      </div>
                    );
                  },
                )}
              </div>
            </DataState>
            <div className="panel-footnote">Counts are derived from stored extraction status.</div>
          </section>

          <section className="intel-panel findings-panel">
            <PanelHeading
              label="RECENT INVESTIGATIONS"
              title="Case register"
              count={cases.records.length}
              to="/cases"
            />
            <DataState loading={cases.loading} error={cases.error} empty={!cases.records.length}>
              <RecordTable records={cases.records.slice(0, 5)} kind="cases" />
            </DataState>
          </section>

          <section className="intel-panel findings-summary">
            <div className="summary-emblem">
              <FileCheck2 size={20} />
            </div>
            <div>
              <p className="section-label">FINDINGS ON RECORD</p>
              <strong className="summary-count">
                {findings.loading ? "—" : findings.error ? "!" : findings.records.length}
              </strong>
              <p>Stored assessments across accessible cases.</p>
            </div>
            <Link to="/findings" aria-label="Open findings">
              <ArrowUpRight size={17} />
            </Link>
            {findings.error ? (
              <span className="summary-error">Findings could not be loaded.</span>
            ) : null}
          </section>
        </div>
      </section>
    </WorkspaceGate>
  );
}

function Metric({
  label,
  value,
  loading,
  error,
  icon: Icon,
  tint,
}: {
  label: string;
  value: number;
  loading: boolean;
  error: string | null;
  icon: typeof Activity;
  tint: string;
}) {
  return (
    <div className={`ops-metric metric-${tint}`} title={error ?? undefined}>
      <span className="metric-icon">
        <Icon size={16} />
      </span>
      <div>
        <span className="metric-label">{label}</span>
        <strong className="metric-value mono-data">{loading ? "—" : error ? "!" : value}</strong>
      </div>
    </div>
  );
}

function PanelHeading({
  label,
  title,
  count,
  to,
}: {
  label: string;
  title: string;
  count: number;
  to: "/campaigns" | "/audit-log" | "/evidence" | "/cases";
}) {
  return (
    <div className="intel-panel-heading">
      <div>
        <p className="section-label">{label}</p>
        <h2>{title}</h2>
      </div>
      <Link to={to} className="panel-count">
        {count}
        <ArrowUpRight size={13} />
      </Link>
    </div>
  );
}

function ActivityRow({ event }: { event: CloudRecord }) {
  const action = valueOf(event, "action");
  return (
    <div className="activity-row">
      <span className="activity-rail">
        <span />
      </span>
      <div className="activity-copy">
        <strong>{humanize(action)}</strong>
        <span>
          {humanize(valueOf(event, "object_type"))} ·{" "}
          {event["case_id"] ? "Case-linked record" : "Workspace event"}
        </span>
      </div>
      <time className="activity-time">{formatDate(valueOf(event, "created_at"))}</time>
    </div>
  );
}

function formatConfidence(value: unknown) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "—";
}
