import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Minus, Move, Network, Plus, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataState,
  PageHeading,
  useWorkspaceRows,
  valueOf,
} from "@/components/deeptrace/workspace";
import { humanize, type CloudRecord } from "@/lib/deeptrace";
import { WorkspaceGate } from "@/components/deeptrace/app-shell";

const GRAPH_WIDTH = 900;
const GRAPH_HEIGHT = 520;
const ENTITY_FILTERS = ["all", "domain", "ip", "email", "url", "hash", "phone"] as const;
type EntityFilter = (typeof ENTITY_FILTERS)[number];
type PanStart = { x: number; y: number; panX: number; panY: number };

export function PhishGraphScreen() {
  const entitiesQuery = useWorkspaceRows("entities");
  const relationshipsQuery = useWorkspaceRows("relationships");
  const observationsQuery = useWorkspaceRows("entity_observations");
  const evidenceQuery = useWorkspaceRows("evidence");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [needle, setNeedle] = useState("");
  const [filter, setFilter] = useState<EntityFilter>("all");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [tracing, setTracing] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const panStart = useRef<PanStart | null>(null);

  const positionedEntities = useMemo(
    () => layoutEntities(entitiesQuery.records),
    [entitiesQuery.records],
  );
  const selected = positionedEntities.find((entity) => entity.id === selectedId) ?? null;
  const search = needle.trim().toLowerCase();
  const visibleEntities = positionedEntities.filter((entity) => {
    const matchesType = filter === "all" || entity.type === filter;
    const matchesSearch =
      !search || `${entity.value} ${entity.type}`.toLowerCase().includes(search);
    return matchesType && matchesSearch;
  });
  const visibleIds = new Set(visibleEntities.map((entity) => entity.id));
  const visibleRelationships = relationshipsQuery.records.filter(
    (relationship) =>
      visibleIds.has(valueOf(relationship, "source_entity_id")) &&
      visibleIds.has(valueOf(relationship, "target_entity_id")),
  );
  const connected = selected
    ? relationshipsQuery.records.filter(
        (relationship) =>
          valueOf(relationship, "source_entity_id") === selected.id ||
          valueOf(relationship, "target_entity_id") === selected.id,
      )
    : [];
  const relatedObservations = selected
    ? observationsQuery.records.filter(
        (observation) => valueOf(observation, "entity_id") === selected.id,
      )
    : [];
  const evidenceById = new Map(
    evidenceQuery.records.map((record) => [valueOf(record, "id"), record]),
  );

  const graphError = entitiesQuery.error || relationshipsQuery.error || null;
  const graphLoading = entitiesQuery.loading || relationshipsQuery.loading;

  function startPan(event: React.PointerEvent<SVGSVGElement>) {
    if ((event.target as Element).closest(".phishgraph-node")) return;
    panStart.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePan(event: React.PointerEvent<SVGSVGElement>) {
    if (!panStart.current || !svgRef.current) return;
    const bounds = svgRef.current.getBoundingClientRect();
    const start = panStart.current;
    setPan({
      x: start.panX + ((event.clientX - start.x) / bounds.width) * GRAPH_WIDTH,
      y: start.panY + ((event.clientY - start.y) / bounds.height) * GRAPH_HEIGHT,
    });
  }

  function endPan(event: React.PointerEvent<SVGSVGElement>) {
    panStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function changeZoom(delta: number) {
    setZoom((current) => Math.min(1.8, Math.max(0.55, Number((current + delta).toFixed(2)))));
  }

  return (
    <WorkspaceGate>
      <section className="phishgraph-page page-enter">
        <PageHeading
          eyebrow="INTELLIGENCE / PHISHGRAPH"
          title="PhishGraph"
          description="Explore entity relationships recorded in your organization's investigations. Every node and edge is sourced from workspace records."
        />
        <div className="graph-integrity-note">
          <span className="integrity-mark" />
          <span>
            <strong>Evidence boundary</strong> Edges represent stored relationship rows only. The
            schema does not record a confirmed/suspected label; confidence is shown as recorded and
            is not treated as verification.
          </span>
        </div>
        <section className="phishgraph-workbench">
          <div className="phishgraph-main">
            <div className="phishgraph-toolbar">
              <label className="phishgraph-search">
                <Search size={15} />
                <input
                  aria-label="Search entities"
                  placeholder="Search entities…"
                  value={needle}
                  onChange={(event) => setNeedle(event.target.value)}
                />
              </label>
              <div className="graph-controls" aria-label="Graph controls">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Zoom out"
                  onClick={() => changeZoom(-0.15)}
                >
                  <Minus size={15} />
                </Button>
                <span className="zoom-value mono-data">{Math.round(zoom * 100)}%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Zoom in"
                  onClick={() => changeZoom(0.15)}
                >
                  <Plus size={15} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Reset graph view"
                  onClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                >
                  <RotateCcw size={14} />
                </Button>
                <Button
                  variant={tracing ? "secondary" : "ghost"}
                  size="icon"
                  aria-label={tracing ? "Stop graph traversal" : "Trace selected connections"}
                  onClick={() => setTracing((active) => !active)}
                  disabled={!selected}
                >
                  <Network size={15} />
                </Button>
              </div>
            </div>
            <div className="entity-filter-row" aria-label="Filter entities by type">
              {ENTITY_FILTERS.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`entity-filter ${filter === type ? "entity-filter-active" : ""}`}
                  onClick={() => setFilter(type)}
                >
                  {type === "all" ? "All types" : type}
                </button>
              ))}
              <span className="graph-record-count mono-data">
                {visibleEntities.length} / {positionedEntities.length} entities
              </span>
            </div>
            <DataState
              loading={graphLoading}
              error={graphError}
              empty={!entitiesQuery.records.length}
            >
              {entitiesQuery.records.length > 0 && !visibleEntities.length ? (
                <div className="graph-filter-empty">No recorded entities match these filters.</div>
              ) : (
                <div className="phishgraph-canvas">
                  <svg
                    ref={svgRef}
                    viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
                    role="img"
                    aria-label="Interactive graph of recorded investigation entities and relationships"
                    onPointerDown={startPan}
                    onPointerMove={movePan}
                    onPointerUp={endPan}
                    onPointerCancel={endPan}
                    onWheel={(event) => {
                      event.preventDefault();
                      changeZoom(event.deltaY < 0 ? 0.08 : -0.08);
                    }}
                  >
                    <defs>
                      <pattern id="graph-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                        <path
                          d="M 36 0 L 0 0 0 36"
                          fill="none"
                          stroke="currentColor"
                          strokeOpacity=".07"
                          strokeWidth=".6"
                        />
                      </pattern>
                    </defs>
                    <rect width={GRAPH_WIDTH} height={GRAPH_HEIGHT} fill="url(#graph-grid)" />
                    <g
                      transform={`translate(${pan.x} ${pan.y}) translate(${GRAPH_WIDTH / 2} ${GRAPH_HEIGHT / 2}) scale(${zoom}) translate(${-GRAPH_WIDTH / 2} ${-GRAPH_HEIGHT / 2})`}
                    >
                      {visibleRelationships.map((relationship) => {
                        const source = positionedEntities.find(
                          (entity) => entity.id === valueOf(relationship, "source_entity_id"),
                        );
                        const target = positionedEntities.find(
                          (entity) => entity.id === valueOf(relationship, "target_entity_id"),
                        );
                        if (!source || !target) return null;
                        const isConnected = Boolean(
                          selected && (source.id === selected.id || target.id === selected.id),
                        );
                        return (
                          <g
                            key={valueOf(relationship, "id")}
                            className={`phishgraph-edge ${typeof relationship["confidence"] === "number" ? "edge-confidence-present" : "edge-confidence-empty"} ${tracing && isConnected ? "edge-tracing" : ""}`}
                          >
                            <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} />
                            <title>
                              {humanize(valueOf(relationship, "relationship_type"))}:{" "}
                              {typeof relationship["confidence"] === "number"
                                ? `${Math.round(Number(relationship["confidence"]) * 100)}% confidence recorded`
                                : "confidence not recorded"}
                            </title>
                          </g>
                        );
                      })}
                      {visibleEntities.map((entity) => (
                        <g
                          key={entity.id}
                          className={`phishgraph-node entity-${entity.type.replaceAll("_", "-")} ${selected?.id === entity.id ? "phishgraph-node-selected" : ""}`}
                          transform={`translate(${entity.x} ${entity.y})`}
                          role="button"
                          tabIndex={0}
                          aria-label={`${entity.type} ${entity.value}`}
                          aria-pressed={selected?.id === entity.id}
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={() => setSelectedId(entity.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedId(entity.id);
                            }
                          }}
                        >
                          <circle className="node-halo" r="22" />
                          <circle className="node-core" r="14" />
                          <text className="node-type" y="-25">
                            {entity.type.replaceAll("_", " ")}
                          </text>
                          <text className="node-label" y="34">
                            {truncate(entity.value, 25)}
                          </text>
                        </g>
                      ))}
                    </g>
                  </svg>
                  <div className="graph-pan-hint">
                    <Move size={12} /> Drag canvas to pan · scroll to zoom
                  </div>
                </div>
              )}
            </DataState>
            <div className="graph-legend">
              <span>
                <i className="legend-edge-recorded" />
                Relationship row recorded
              </span>
              <span>
                <i className="legend-edge-confidence" />
                Confidence field populated
              </span>
              <span>
                <i className="legend-edge-empty" />
                Confidence absent
              </span>
            </div>
          </div>
          <aside className="phishgraph-inspector">
            <div className="inspector-heading">
              <div>
                <p className="section-label">ENTITY INSPECTOR</p>
                <h2>{selected ? "Selected entity" : "Awaiting selection"}</h2>
              </div>
              <span className="inspector-count mono-data">{selected ? connected.length : "—"}</span>
            </div>
            {selected ? (
              <>
                <div className={`entity-type-stamp entity-${selected.type.replaceAll("_", "-")}`}>
                  {selected.type.replaceAll("_", " ")}
                </div>
                <strong className="inspector-value">{selected.value}</strong>
                <div className="inspector-meta">
                  <span>Case</span>
                  <Link to="/cases/$caseId" params={{ caseId: selected.caseId }}>
                    {selected.caseId.slice(0, 8)}…
                  </Link>
                </div>
                <section className="inspector-section">
                  <p className="section-label">RECORDED RELATIONSHIPS</p>
                  {relationshipsQuery.loading ? (
                    <p className="inspector-muted">Loading relationship records…</p>
                  ) : connected.length ? (
                    connected.map((relationship) => {
                      const otherId =
                        valueOf(relationship, "source_entity_id") === selected.id
                          ? valueOf(relationship, "target_entity_id")
                          : valueOf(relationship, "source_entity_id");
                      const other = positionedEntities.find((entity) => entity.id === otherId);
                      return (
                        <div className="relationship-detail" key={valueOf(relationship, "id")}>
                          <span className="relationship-detail-kind">
                            {humanize(valueOf(relationship, "relationship_type"))}
                          </span>
                          <strong>{other?.value ?? "Entity not in current view"}</strong>
                          <span>
                            {typeof relationship["confidence"] === "number"
                              ? `${Math.round(Number(relationship["confidence"]) * 100)}% confidence recorded`
                              : "No confidence recorded"}
                          </span>
                          <p>
                            {valueOf(relationship, "rationale") ||
                              "No relationship explanation was recorded."}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="inspector-muted">
                      No relationship rows are recorded for this entity.
                    </p>
                  )}
                </section>
                <section className="inspector-section">
                  <p className="section-label">EVIDENCE PROVENANCE</p>
                  {observationsQuery.loading || evidenceQuery.loading ? (
                    <p className="inspector-muted">Loading provenance…</p>
                  ) : relatedObservations.length ? (
                    relatedObservations.slice(0, 5).map((observation) => {
                      const evidenceId = valueOf(observation, "evidence_id");
                      const source = evidenceById.get(evidenceId);
                      const details = observation["details"];
                      const context = getStringProperty(details, "context");
                      return (
                        <div className="provenance-detail" key={valueOf(observation, "id")}>
                          <strong>
                            {source
                              ? valueOf(source, "evidence_code")
                              : "Evidence record unavailable"}
                          </strong>
                          <span>{valueOf(observation, "observed_at")}</span>
                          {context ? <p>{context}</p> : null}
                        </div>
                      );
                    })
                  ) : (
                    <p className="inspector-muted">
                      No evidence observations are recorded for this entity.
                    </p>
                  )}
                  {observationsQuery.error || evidenceQuery.error ? (
                    <p className="inspector-error">Some provenance records could not be loaded.</p>
                  ) : null}
                </section>
              </>
            ) : (
              <div className="inspector-empty">
                <Network size={20} />
                <p>Select a node to inspect its recorded relationships and evidence provenance.</p>
              </div>
            )}
          </aside>
        </section>
      </section>
    </WorkspaceGate>
  );
}

function layoutEntities(records: CloudRecord[]) {
  const radius = Math.min(190, 60 + records.length * 8);
  return records.map((record, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / Math.max(records.length, 1);
    return {
      ...record,
      id: valueOf(record, "id"),
      caseId: valueOf(record, "case_id"),
      type: valueOf(record, "entity_type").toLowerCase() || "other",
      value: valueOf(record, "value") || "Unspecified entity",
      x: GRAPH_WIDTH / 2 + Math.cos(angle) * radius,
      y: GRAPH_HEIGHT / 2 + Math.sin(angle) * radius,
    };
  });
}

function truncate(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function getStringProperty(value: unknown, key: string) {
  if (!isRecord(value) || !(key in value)) return "";
  const property = value[key];
  return typeof property === "string" ? property : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
