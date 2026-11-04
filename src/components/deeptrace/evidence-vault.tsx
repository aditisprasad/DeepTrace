import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  Archive,
  Check,
  ChevronRight,
  FileImage,
  FileJson,
  FileSearch,
  FileText,
  FileUp,
  Filter,
  Hash,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DataState,
  PageHeading,
  useWorkspaceRows,
  valueOf,
} from "@/components/deeptrace/workspace";
import { useDeepTraceSession, WorkspaceGate } from "@/components/deeptrace/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { ingestEvidence } from "@/lib/ingest.functions";
import { checkUpload, contentTypeFor, MAX_UPLOAD_BYTES } from "@/lib/extraction";
import { formatBytes, formatDate, humanize, safeFileName, type CloudRecord } from "@/lib/deeptrace";

type ExtractionFilter = "all" | "pending" | "extracted" | "no_findings" | "unsupported" | "failed";

export function EvidenceVaultScreen() {
  const session = useDeepTraceSession();
  const evidence = useWorkspaceRows("evidence");
  const cases = useWorkspaceRows("cases");
  const provenance = useWorkspaceRows("evidence_sources");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ExtractionFilter>("all");
  const [caseId, setCaseId] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const selected = evidence.records.find((record) => valueOf(record, "id") === selectedId) ?? null;
  const normalizedSearch = search.trim().toLowerCase();
  const visibleEvidence = useMemo(
    () =>
      evidence.records.filter((record) => {
        const matchesFilter = filter === "all" || record["extraction_status"] === filter;
        const searchable = [
          record["evidence_code"],
          record["original_name"],
          record["value"],
          record["sha256"],
          record["type"],
          record["source"],
        ]
          .filter((value) => typeof value === "string")
          .join(" ")
          .toLowerCase();
        return matchesFilter && (!normalizedSearch || searchable.includes(normalizedSearch));
      }),
    [evidence.records, filter, normalizedSearch],
  );
  const selectedSources = selected
    ? provenance.records.filter(
        (record) => valueOf(record, "evidence_id") === valueOf(selected, "id"),
      )
    : [];
  const pendingCount = evidence.records.filter(
    (record) => record["extraction_status"] === "pending",
  ).length;
  const failedCount = evidence.records.filter(
    (record) => record["extraction_status"] === "failed",
  ).length;
  const availableCases = cases.records.filter((record) => valueOf(record, "id"));
  const canUpload = Boolean(
    session.identity && availableCases.length && !uploading && !cases.error,
  );

  useEffect(() => {
    let active = true;
    setPreviewUrl(null);
    setPreviewError("");
    if (
      !selected ||
      !valueOf(selected, "storage_path") ||
      !valueOf(selected, "content_type").startsWith("image/")
    ) {
      return () => {
        active = false;
      };
    }

    setPreviewing(true);
    void supabase.storage
      .from("deeptrace-evidence")
      .createSignedUrl(valueOf(selected, "storage_path"), 60)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setPreviewError("Private image preview is unavailable for this record.");
          return;
        }
        setPreviewUrl(data.signedUrl);
      })
      .catch(() => {
        if (active) setPreviewError("Private image preview is unavailable for this record.");
      })
      .finally(() => {
        if (active) setPreviewing(false);
      });

    return () => {
      active = false;
    };
  }, [selected]);

  async function handleFile(file: File | undefined) {
    setUploadError("");
    setUploadMessage("");
    if (!file) return;
    if (!caseId) {
      setUploadError("Choose an investigation before adding evidence.");
      return;
    }
    if (!session.identity) {
      setUploadError(
        "Your secure workspace identity is not available. Retry the workspace connection.",
      );
      return;
    }
    const check = checkUpload(file.name, file.size);
    if (!check.ok) {
      setUploadError(check.reason);
      return;
    }

    const storagePath = `${session.identity.organizationId}/${caseId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    setUploading(true);
    try {
      const { data: uploaded, error: uploadErrorResult } = await supabase.storage
        .from("deeptrace-evidence")
        .upload(storagePath, file, { contentType: contentTypeFor(file.name), upsert: false });
      if (uploadErrorResult) throw new Error(uploadErrorResult.message);
      if (!uploaded?.path) throw new Error("Secure storage did not confirm the uploaded file.");

      try {
        const result = await ingestEvidence({
          data: {
            caseId,
            storagePath: uploaded.path,
            originalName: file.name,
            contentType: contentTypeFor(file.name),
            sizeBytes: file.size,
          },
        });
        setUploadMessage(
          `${result.evidenceCode} added · ${humanize(result.extractionStatus)} · ${result.entityCount} entities recorded`,
        );
        evidence.refresh();
        provenance.refresh();
        toast.success("Evidence secured and processed.", { description: result.evidenceCode });
      } catch (error) {
        const { error: cleanupError } = await supabase.storage
          .from("deeptrace-evidence")
          .remove([uploaded.path]);
        const message = error instanceof Error ? error.message : "Evidence processing failed.";
        throw new Error(
          cleanupError
            ? `${message} The uploaded object could not be removed; contact a workspace administrator.`
            : `${message} The unprocessed upload was removed from secure storage.`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Evidence could not be uploaded.";
      setUploadError(message);
      toast.error("Evidence upload failed.", { description: message });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files.item(0) ?? undefined);
  }

  return (
    <WorkspaceGate>
      <section className="evidence-vault page-enter">
        <PageHeading
          eyebrow="INVESTIGATIONS / EVIDENCE VAULT"
          title="Evidence Vault"
          description="A traceable register of submitted evidence, its extraction state, and recorded provenance."
          action={
            <span className="vault-record-total mono-data">
              {evidence.loading ? "—" : evidence.records.length.toString().padStart(2, "0")}{" "}
              <small>RECORDS</small>
            </span>
          }
        />
        <section
          className={`evidence-dropzone ${dragging ? "evidence-dropzone-active" : ""} ${uploading ? "evidence-dropzone-busy" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null))
              setDragging(false);
          }}
          onDrop={onDrop}
          aria-label="Upload evidence to an investigation"
        >
          <div className="dropzone-emblem">
            {uploading ? <span className="upload-progress-ring" /> : <FileUp size={21} />}
          </div>
          <div className="dropzone-copy">
            <p className="section-label">
              {uploading ? "SECURE INGESTION IN PROGRESS" : "ADD TO CHAIN OF CUSTODY"}
            </p>
            <h2>{uploading ? "Securing evidence…" : "Drop a file to begin evidence intake"}</h2>
            <span>
              Images, text, EML, CSV, JSON, HTML, and PDF · up to {formatBytes(MAX_UPLOAD_BYTES)}
            </span>
          </div>
          <div className="dropzone-action">
            <label className="case-select-label" htmlFor="evidence-case">
              INVESTIGATION
            </label>
            <select
              id="evidence-case"
              value={caseId}
              onChange={(event) => setCaseId(event.target.value)}
              disabled={uploading || cases.loading || !availableCases.length}
            >
              <option value="">
                {cases.loading
                  ? "Loading cases…"
                  : availableCases.length
                    ? "Select a case"
                    : "No accessible cases"}
              </option>
              {availableCases.map((record) => (
                <option key={valueOf(record, "id")} value={valueOf(record, "id")}>
                  {valueOf(record, "case_code")} · {valueOf(record, "title")}
                </option>
              ))}
            </select>
            <Button type="button" onClick={() => fileInput.current?.click()} disabled={!canUpload}>
              <Archive size={15} /> {uploading ? "Processing…" : "Choose file"}
            </Button>
            <input
              ref={fileInput}
              className="visually-hidden"
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.gif,.bmp,.txt,.md,.csv,.json,.log,.eml,.headers,.xml,.yml,.yaml,.html,.htm,.pdf"
              onChange={(event) => void handleFile(event.target.files?.[0])}
              aria-label="Choose an evidence file"
            />
          </div>
        </section>
        {!cases.loading && !availableCases.length ? (
          cases.error ? (
            <div className="vault-message vault-message-error" role="alert">
              <ShieldAlert size={15} />
              Accessible investigations could not be loaded. Evidence intake is disabled until the
              case list is available.
            </div>
          ) : (
            <div className="vault-inline-note">
              Evidence must be attached to a case.{" "}
              <Link to="/cases/new">
                Open an investigation <ChevronRight size={13} />
              </Link>
            </div>
          )
        ) : null}
        {uploadError ? (
          <div className="vault-message vault-message-error" role="alert">
            <ShieldAlert size={15} />
            {uploadError}
          </div>
        ) : null}
        {uploadMessage ? (
          <div className="vault-message vault-message-success" role="status">
            <Check size={15} />
            {uploadMessage}
          </div>
        ) : null}

        <div className="vault-toolbar">
          <label className="vault-search">
            <Search size={15} />
            <input
              aria-label="Search evidence"
              placeholder="Search evidence, hashes, filenames…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="vault-filter">
            <Filter size={14} />
            <select
              aria-label="Filter evidence by extraction status"
              value={filter}
              onChange={(event) => setFilter(event.target.value as ExtractionFilter)}
            >
              <option value="all">All extraction states</option>
              <option value="pending">Pending</option>
              <option value="extracted">Extracted</option>
              <option value="no_findings">No findings</option>
              <option value="unsupported">Unsupported</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="vault-status-counts">
            <span>{pendingCount} pending</span>
            <span className={failedCount ? "vault-failed-count" : ""}>{failedCount} failed</span>
          </div>
        </div>

        <DataState
          loading={evidence.loading}
          error={evidence.error}
          empty={!evidence.records.length}
        >
          <div className="vault-content">
            <div className="evidence-card-grid">
              {!visibleEvidence.length ? (
                <div className="vault-filter-empty">
                  <Archive size={19} />
                  <strong>No matching evidence</strong>
                  <span>Adjust the filters or search terms to inspect other records.</span>
                </div>
              ) : (
                visibleEvidence.map((record, index) => (
                  <EvidenceCard
                    key={valueOf(record, "id")}
                    record={record}
                    selected={valueOf(record, "id") === selectedId}
                    index={index}
                    onSelect={() => setSelectedId(valueOf(record, "id"))}
                  />
                ))
              )}
            </div>
            <aside className="evidence-inspector">
              {selected ? (
                <>
                  <div className={`evidence-preview evidence-type-${valueOf(selected, "type")}`}>
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={`Private preview of ${valueOf(selected, "original_name")}`}
                      />
                    ) : (
                      <EvidenceIcon type={valueOf(selected, "type")} size={27} />
                    )}
                    {previewing ? (
                      <span className="preview-loading">Preparing private preview…</span>
                    ) : null}
                    {previewError ? <span className="preview-error">{previewError}</span> : null}
                    {previewUrl ? (
                      <span className="preview-private">
                        <ShieldCheck size={12} /> PRIVATE PREVIEW
                      </span>
                    ) : null}
                  </div>
                  <div className="inspector-record-code">{valueOf(selected, "evidence_code")}</div>
                  <h2 className="evidence-inspector-title">
                    {valueOf(selected, "original_name") ||
                      valueOf(selected, "value") ||
                      "Evidence record"}
                  </h2>
                  <span
                    className={`extraction-state extraction-${valueOf(selected, "extraction_status")}`}
                  >
                    <span />
                    {humanize(valueOf(selected, "extraction_status"))}
                  </span>
                  <div className="evidence-metadata">
                    <Metadata label="Evidence type" value={humanize(valueOf(selected, "type"))} />
                    <Metadata
                      label="Collection"
                      value={formatDate(valueOf(selected, "collected_at"))}
                    />
                    <Metadata
                      label="File size"
                      value={
                        typeof selected["size_bytes"] === "number"
                          ? formatBytes(selected["size_bytes"])
                          : "Not recorded"
                      }
                    />
                    <Metadata
                      label="MIME type"
                      value={valueOf(selected, "content_type") || "Not recorded"}
                    />
                  </div>
                  <div className="evidence-hash-panel">
                    <div>
                      <Hash size={14} />
                      <span>SHA-256</span>
                    </div>
                    <code>{valueOf(selected, "sha256") || "Hash not recorded"}</code>
                  </div>
                  <section className="provenance-panel">
                    <p className="section-label">PROVENANCE</p>
                    {provenance.loading ? (
                      <span className="inspector-muted">Loading source records…</span>
                    ) : selectedSources.length ? (
                      selectedSources.map((source) => (
                        <div className="source-record" key={valueOf(source, "id")}>
                          <strong>{humanize(valueOf(source, "source_type"))}</strong>
                          <span>{formatDate(valueOf(source, "collected_at"))}</span>
                        </div>
                      ))
                    ) : (
                      <span className="inspector-muted">
                        No provenance source record is available.
                      </span>
                    )}
                    {provenance.error ? (
                      <span className="inspector-error">
                        Provenance records could not be loaded.
                      </span>
                    ) : null}
                  </section>
                </>
              ) : (
                <div className="evidence-inspector-empty">
                  <FileSearch size={22} />
                  <p>
                    Select an evidence record to inspect its hash, processing state, and provenance.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </DataState>
      </section>
    </WorkspaceGate>
  );
}

function EvidenceCard({
  record,
  selected,
  index,
  onSelect,
}: {
  record: CloudRecord;
  selected: boolean;
  index: number;
  onSelect: () => void;
}) {
  const type = valueOf(record, "type");
  const status = valueOf(record, "extraction_status");
  return (
    <button
      type="button"
      className={`evidence-card ${selected ? "evidence-card-selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
      style={{ animationDelay: `${Math.min(index, 6) * 35}ms` }}
    >
      <div className={`evidence-card-type evidence-type-${type}`}>
        <EvidenceIcon type={type} size={19} />
        <span>{type.toUpperCase()}</span>
      </div>
      <div className="evidence-card-copy">
        <span className="evidence-card-code mono-data">{valueOf(record, "evidence_code")}</span>
        <strong>
          {valueOf(record, "original_name") || valueOf(record, "value") || "Evidence record"}
        </strong>
        <span className="evidence-card-source">
          {valueOf(record, "source") || "Source not recorded"}
        </span>
      </div>
      <div className="evidence-card-footer">
        <span className={`extraction-state extraction-${status}`}>
          <span />
          {humanize(status)}
        </span>
        <span className="evidence-card-time">{formatDate(valueOf(record, "collected_at"))}</span>
      </div>
      {valueOf(record, "sha256") ? (
        <span className="evidence-card-hash">
          <Hash size={11} />
          {valueOf(record, "sha256").slice(0, 16)}…
        </span>
      ) : null}
    </button>
  );
}

function EvidenceIcon({ type, size }: { type: string; size: number }) {
  if (type === "screenshot" || type === "file")
    return type === "screenshot" ? <FileImage size={size} /> : <FileText size={size} />;
  if (type === "hash") return <Hash size={size} />;
  if (type === "email" || type === "email_header") return <FileJson size={size} />;
  return <FileSearch size={size} />;
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <div className="evidence-metadata-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
