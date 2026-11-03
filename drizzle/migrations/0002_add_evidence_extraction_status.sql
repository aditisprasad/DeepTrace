ALTER TABLE public.evidence
  ADD COLUMN extraction_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (extraction_status IN ('pending', 'extracted', 'no_findings', 'unsupported', 'failed'));

COMMENT ON COLUMN public.evidence.extraction_status IS 'Ingestion pipeline state: pending = not yet processed, extracted = entities were extracted, no_findings = processed but nothing matched, unsupported = file format has no extractor, failed = processing error.';
CREATE INDEX evidence_case_extraction_idx ON public.evidence (case_id, extraction_status);