import { describe, expect, it } from "vitest";
import { checkUpload, extractFromText, hashVariant, MAX_UPLOAD_BYTES, validateEvidenceValue } from "@/lib/extraction";

const SAMPLE = [
  "Incident report follows.",
  "Sender was Billing Team <billing@supplier-example.com> from mailer.phish-example.net (203.0.113.7).",
  "Victim clicked https://accounts.supplier-example.com/login?next=/pay on 2026-01-03T15:04:05Z.",
  "The attachment matched sha256 9f2b8f0e6a1c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6 and md5 4d186321c1e7c0c2f4d94d3c4e6b709c.",
  "Call-back number +1 (415) 555-0132 was left in the voicemail.",
].join("\n");

describe("extractFromText", () => {
  it("finds the URL and never re-extracts its host as a domain", () => {
    const { observations } = extractFromText(SAMPLE);
    const urls = observations.filter((item) => item.entityType === "url");
    expect(urls).toHaveLength(1);
    expect(urls[0].original).toBe("https://accounts.supplier-example.com/login?next=/pay");
    expect(observations.filter((item) => item.entityType === "domain" && item.normalized === "accounts.supplier-example.com")).toHaveLength(0);
  });

  it("finds the email address lowercased", () => {
    const { observations } = extractFromText(SAMPLE);
    const emails = observations.filter((item) => item.entityType === "email");
    expect(emails).toHaveLength(1);
    expect(emails[0].normalized).toBe("billing@supplier-example.com");
  });

  it("finds the bare domain and the IPv4 address", () => {
    const { observations } = extractFromText(SAMPLE);
    expect(observations.find((item) => item.entityType === "domain")?.normalized).toBe("mailer.phish-example.net");
    expect(observations.find((item) => item.entityType === "ip")?.normalized).toBe("203.0.113.7");
  });

  it("classifies 64-hex as sha256 and 32-hex as md5, once each", () => {
    const { observations } = extractFromText(SAMPLE);
    const hashes = observations.filter((item) => item.entityType === "hash");
    expect(hashes).toHaveLength(2);
    const variants = hashes.map((item) => splitHashValue(item.normalized)?.variant);
    expect(variants).toContain("sha256");
    expect(variants).toContain("md5");
  });

  it("extracts the ISO timestamp", () => {
    const { timestamps } = extractFromText(SAMPLE);
    expect(timestamps).toHaveLength(1);
    expect(timestamps[0].original).toBe("2026-01-03T15:04:05Z");
  });

  it("extracts the phone number with canonical digits and keeps the plus", () => {
    const { observations } = extractFromText(SAMPLE);
    const phones = observations.filter((item) => item.entityType === "phone");
    expect(phones).toHaveLength(1);
    expect(phones[0].normalized).toBe("+14155550132");
  });

  it("does not extract the IP, timestamp, or hash digits as phone numbers", () => {
    const { observations } = extractFromText(SAMPLE);
    const phones = observations.filter((item) => item.entityType === "phone");
    expect(phones.map((item) => item.original)).not.toContain("203.0.113.7");
    expect(phones).toHaveLength(1);
  });

  it("keeps the surrounding context with each observation", () => {
    const { observations } = extractFromText(SAMPLE);
    expect(observations.every((item) => item.context.length > item.original.length)).toBe(true);
  });

  it("rejects a version-style number as a domain", () => {
    const { observations } = extractFromText("Running agent version 1.2.3 build 4410.");
    expect(observations.filter((item) => item.entityType === "domain")).toHaveLength(0);
  });
});

describe("validateEvidenceValue", () => {
  it("accepts a valid URL and keeps it unchanged", () => {
    expect(validateEvidenceValue("url", " https://example.com/a ")).toEqual({ ok: true, normalized: "https://example.com/a" });
  });

  it("rejects a URL without a scheme", () => {
    expect(validateEvidenceValue("url", "example.com/a").ok).toBe(false);
  });

  it("lowercases domains and tolerates a trailing dot", () => {
    expect(validateEvidenceValue("domain", "Mail.Example.COM.")).toEqual({ ok: true, normalized: "mail.example.com" });
  });

  it("rejects an impossible IPv4 octet", () => {
    expect(validateEvidenceValue("ip", "999.1.1.1").ok).toBe(false);
    expect(validateEvidenceValue("ip", "203.0.113.10").ok).toBe(true);
  });

  it("lowercases emails and hashes", () => {
    expect(validateEvidenceValue("email", "Ops@Example.COM")).toEqual({ ok: true, normalized: "ops@example.com" });
    const hash = "9F2B8F0E6A1C4D5E6F708192A3B4C5D6E7F8091A2B3C4D5E6F708192A3B4C5D6".toLowerCase();
    expect(validateEvidenceValue("hash", hash.toUpperCase())).toEqual({ ok: true, normalized: hash });
    expect(hashVariant(hash)).toBe("sha256");
  });

  it("rejects a hash of the wrong length", () => {
    expect(validateEvidenceValue("hash", "deadbeef").ok).toBe(false);
  });

  it("canonicalizes a phone number to digits with a plus", () => {
    expect(validateEvidenceValue("phone", "+1 (415) 555-0132")).toEqual({ ok: true, normalized: "+14155550132" });
    expect(validateEvidenceValue("phone", "123").ok).toBe(false);
  });

  it("rejects typed input for file-based evidence types", () => {
    expect(validateEvidenceValue("screenshot", "anything").ok).toBe(false);
    expect(validateEvidenceValue("file", "anything").ok).toBe(false);
  });
});

describe("checkUpload", () => {
  it("accepts a small text file", () => {
    expect(checkUpload("headers.txt", 2048)).toEqual({ ok: true, category: "text" });
    expect(checkUpload("screenshot.png", 1024)).toEqual({ ok: true, category: "image" });
    expect(checkUpload("report.pdf", 1024)).toEqual({ ok: true, category: "document" });
  });

  it("rejects executables by extension", () => {
    expect(checkUpload("invoice.exe", 1024).ok).toBe(false);
    expect(checkUpload("macro.docm.bat", 1024).ok).toBe(false);
  });

  it("rejects files over the 25 MB bucket limit", () => {
    const result = checkUpload("big.log", MAX_UPLOAD_BYTES + 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("25 MB");
  });

  it("rejects empty files and unknown types", () => {
    expect(checkUpload("empty.txt", 0).ok).toBe(false);
    expect(checkUpload("archive.tar.gz", 1024).ok).toBe(false);
  });
});
