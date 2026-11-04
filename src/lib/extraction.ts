// Deterministic evidence extraction and validation.
// Pure pattern matching — browser-safe and worker-safe (no Node APIs).
// This is explicitly NOT AI detection: every finding traces to a regex over the
// original evidence text, and the original value is always preserved alongside
// the normalized one.

export const EVIDENCE_TYPES = [
  "url", "domain", "ip", "email", "email_header", "screenshot", "file", "hash", "phone", "other",
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const TYPED_EVIDENCE_TYPES: EvidenceType[] = ["url", "domain", "ip", "email", "hash", "phone", "other", "email_header"];

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // matches the storage bucket limit

export type UploadCategory = "image" | "text" | "document";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "bmp"];
const TEXT_EXTENSIONS = ["txt", "md", "csv", "json", "log", "eml", "headers", "xml", "yml", "yaml", "html", "htm"];
const DOCUMENT_EXTENSIONS = ["pdf"];
const BLOCKED_EXTENSIONS = ["exe", "dll", "bat", "cmd", "sh", "js", "mjs", "msi", "scr", "ps1", "vbs", "com", "jar", "apk"];

export type UploadCheck = { ok: true; category: UploadCategory } | { ok: false; reason: string };

export function fileExtension(fileName: string): string {
  const base = fileName.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

export function checkUpload(fileName: string, sizeBytes: number): UploadCheck {
  const extension = fileExtension(fileName);
  if (BLOCKED_EXTENSIONS.includes(extension)) {
    return { ok: false, reason: `Executable file type (.${extension}) is not accepted as evidence.` };
  }
  if (!IMAGE_EXTENSIONS.includes(extension) && !TEXT_EXTENSIONS.includes(extension) && !DOCUMENT_EXTENSIONS.includes(extension)) {
    return { ok: false, reason: `Unsupported file type (.${extension || "unknown"}). Accepted: images, text documents, CSV/JSON/HTML/EML, and PDF.` };
  }
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: `File is ${Math.ceil(sizeBytes / (1024 * 1024))} MB; the limit is 25 MB.` };
  }
  if (sizeBytes === 0) return { ok: false, reason: "File is empty." };
  const category: UploadCategory = IMAGE_EXTENSIONS.includes(extension)
    ? "image"
    : DOCUMENT_EXTENSIONS.includes(extension) ? "document" : "text";
  return { ok: true, category };
}

export function contentTypeFor(fileName: string): string {
  const extension = fileExtension(fileName);
  const map: Record<string, string> = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp",
    gif: "image/gif", bmp: "image/bmp", pdf: "application/pdf",
    csv: "text/csv", json: "application/json", html: "text/html", htm: "text/html",
    eml: "message/rfc822", xml: "application/xml", yml: "text/yaml", yaml: "text/yaml",
  };
  return map[extension] ?? "text/plain";
}

// ---------- typed-IOC validation ----------

export type ValueCheck = { ok: true; normalized: string } | { ok: false; reason: string };

const DOMAIN_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const EMAIL_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;
const IPV4_PATTERN = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const HASH_PATTERN = /^[0-9a-f]{32}$|^[0-9a-f]{40}$|^[0-9a-f]{64}$/i;

export function validateEvidenceValue(type: EvidenceType, rawValue: string): ValueCheck {
  const value = rawValue.trim();
  if (!value) return { ok: false, reason: "Evidence value is empty." };
  switch (type) {
    case "url": {
      if (!/^https?:\/\/\S+$/i.test(value)) return { ok: false, reason: "URLs must start with http:// or https:// and contain no spaces." };
      return { ok: true, normalized: value };
    }
    case "domain": {
      const candidate = value.toLowerCase().replace(/\.$/, "");
      if (!DOMAIN_PATTERN.test(candidate)) return { ok: false, reason: "Not a valid domain name (e.g. mail.example.com)." };
      return { ok: true, normalized: candidate };
    }
    case "ip": {
      if (!IPV4_PATTERN.test(value)) return { ok: false, reason: "Not a valid IPv4 address (e.g. 203.0.113.10)." };
      return { ok: true, normalized: value };
    }
    case "email": {
      const candidate = value.toLowerCase();
      if (!EMAIL_PATTERN.test(candidate)) return { ok: false, reason: "Not a valid email address." };
      return { ok: true, normalized: candidate };
    }
    case "hash": {
      const candidate = value.toLowerCase();
      if (!HASH_PATTERN.test(candidate)) return { ok: false, reason: "Hashes must be 32 (MD5), 40 (SHA-1), or 64 (SHA-256) hex characters." };
      return { ok: true, normalized: candidate };
    }
    case "phone": {
      const digits = value.replace(/[^\d]/g, "");
      if (digits.length < 7 || digits.length > 15) return { ok: false, reason: "Phone numbers must contain 7–15 digits." };
      const plus = value.trim().startsWith("+") ? "+" : "";
      return { ok: true, normalized: `${plus}${digits}` };
    }
    case "email_header": {
      if (value.length > 200_000) return { ok: false, reason: "Email header text exceeds the 200 KB limit." };
      return { ok: true, normalized: value };
    }
    case "other": {
      if (value.length > 200_000) return { ok: false, reason: "Text document exceeds the 200 KB limit." };
      return { ok: true, normalized: value };
    }
    case "screenshot":
    case "file":
      return { ok: false, reason: "This evidence type is attached as a file upload, not typed in." };
  }
}

export function hashVariant(hash: string): "md5" | "sha1" | "sha256" {
  return hash.length === 32 ? "md5" : hash.length === 40 ? "sha1" : "sha256";
}

// ---------- free-text extraction ----------

export type Observation = {
  entityType: "url" | "domain" | "ip" | "email" | "hash" | "phone";
  original: string;
  normalized: string;
  variant?: "md5" | "sha1" | "sha256";
  start: number;
  end: number;
  context: string;
};

export type TimestampHit = { original: string; start: number; end: number };

type Span = { start: number; end: number };

function overlaps(span: Span, taken: Span[]): boolean {
  return taken.some((other) => span.start < other.end && other.start < span.end);
}

function excerpt(text: string, start: number, end: number): string {
  const from = Math.max(0, start - 40);
  const to = Math.min(text.length, end + 40);
  return `${from > 0 ? "…" : ""}${text.slice(from, to).replace(/\s+/g, " ").trim()}${to < text.length ? "…" : ""}`;
}

const URL_PATTERN = /https?:\/\/[^\s<>"'`)\]}]+/gi;
const EMAIL_PATTERN_TEXT = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const DOMAIN_PATTERN_TEXT = /(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}/gi;
const IPV4_PATTERN_TEXT = /(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)/g;
const SHA256_PATTERN = /[0-9a-f]{64}/gi;
const SHA1_PATTERN = /[0-9a-f]{40}/gi;
const MD5_PATTERN = /[0-9a-f]{32}/gi;
const TIMESTAMP_PATTERN = /\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?/g;
const PHONE_PATTERN = /\+?\d[\d\s().-]{5,17}\d/g;

export function extractFromText(text: string): { observations: Observation[]; timestamps: TimestampHit[] } {
  const taken: Span[] = [];
  const observations: Observation[] = [];
  const timestamps: TimestampHit[] = [];

  const addObservation = (
    entityType: Observation["entityType"],
    match: RegExpExecArray,
    normalize: (value: string) => string,
    variant?: Observation["variant"],
  ) => {
    const original = match[0];
    taken.push({ start: match.index, end: match.index + original.length });
    observations.push({
      entityType,
      original,
      normalized: normalize(original),
      ...(variant ? { variant } : {}),
      start: match.index,
      end: match.index + original.length,
      context: excerpt(text, match.index, match.index + original.length),
    });
  };

  for (const match of text.matchAll(URL_PATTERN)) {
    const trimmed = match[0].replace(/[.,;:]+$/, "");
    const span = { start: match.index, end: match.index + trimmed.length };
    if (overlaps(span, taken)) continue;
    taken.push(span);
    observations.push({ entityType: "url", original: trimmed, normalized: trimmed, start: span.start, end: span.end, context: excerpt(text, span.start, span.end) });
  }
  for (const match of text.matchAll(EMAIL_PATTERN_TEXT)) {
    if (overlaps({ start: match.index, end: match.index + match[0].length }, taken)) continue;
    addObservation("email", match, (value) => value.toLowerCase());
  }
  for (const [pattern, variant] of [[SHA256_PATTERN, "sha256"], [SHA1_PATTERN, "sha1"], [MD5_PATTERN, "md5"]] as const) {
    for (const match of text.matchAll(pattern)) {
      if (overlaps({ start: match.index, end: match.index + match[0].length }, taken)) continue;
      addObservation("hash", match, (value) => value.toLowerCase(), variant);
    }
  }
  // Hash observations keep the algorithm as a separate field; the entity value
  // stays the plain lowercase hash so lookups match user-supplied hashes.
  for (const match of text.matchAll(IPV4_PATTERN_TEXT)) {
    if (overlaps({ start: match.index, end: match.index + match[0].length }, taken)) continue;
    addObservation("ip", match, (value) => value);
  }
  for (const match of text.matchAll(DOMAIN_PATTERN_TEXT)) {
    if (overlaps({ start: match.index, end: match.index + match[0].length }, taken)) continue;
    addObservation("domain", match, (value) => value.toLowerCase().replace(/\.$/, ""));
  }
  for (const match of text.matchAll(TIMESTAMP_PATTERN)) {
    const span = { start: match.index, end: match.index + match[0].length };
    taken.push(span);
    timestamps.push({ original: match[0], start: span.start, end: span.end });
  }
  for (const match of text.matchAll(PHONE_PATTERN)) {
    const span = { start: match.index, end: match.index + match[0].length };
    if (overlaps(span, taken)) continue;
    const digits = match[0].replace(/[^\d]/g, "");
    if (digits.length < 7 || digits.length > 15) continue;
    const plus = match[0].trimStart().startsWith("+") ? "+" : "";
    const original = match[0].trim();
    taken.push({ start: match.index, end: match.index + original.length });
    observations.push({
      entityType: "phone",
      original,
      normalized: `${plus}${digits}`,
      start: match.index,
      end: match.index + original.length,
      context: excerpt(text, match.index, match.index + original.length),
    });
  }

  observations.sort((a, b) => a.start - b.start);
  timestamps.sort((a, b) => a.start - b.start);
  return { observations, timestamps };
}

// ---------- upload helpers (shared by browser and ingestion server) ----------

/** Category of an uploaded file by extension only — no size or blocked checks. */
export function uploadCategory(fileName: string): UploadCategory {
  const extension = fileExtension(fileName);
  if (IMAGE_EXTENSIONS.includes(extension)) return "image";
  if (DOCUMENT_EXTENSIONS.includes(extension)) return "document";
  return "text";
}

/** Evidence record type stored for a file upload. */
export function uploadEvidenceType(category: UploadCategory): EvidenceType {
  return category === "image" ? "screenshot" : "file";
}

/** Upper bound on text fed to pattern extraction, matching the typed-input limit. */
export const MAX_TEXT_EXTRACTION_CHARS = 200_000;

export function capExtractionText(text: string): { text: string; capped: boolean } {
  if (text.length <= MAX_TEXT_EXTRACTION_CHARS) return { text, capped: false };
  return { text: text.slice(0, MAX_TEXT_EXTRACTION_CHARS), capped: true };
}

