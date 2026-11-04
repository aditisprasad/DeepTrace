// Client-safe server-function wrappers for evidence ingestion.
// Authorization comes from the authenticated session (requireSupabaseAuth);
// organization and case permissions are re-checked server-side under RLS.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MAX_UPLOAD_BYTES } from "@/lib/extraction";

const ingestInput = z.object({
  caseId: z.string().uuid(),
  storagePath: z.string().min(1).max(800),
  originalName: z.string().min(1).max(300),
  contentType: z.string().min(1).max(200),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export const ingestEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ingestInput.parse(data))
  .handler(async ({ data, context }) => {
    const { ingestUploadedEvidence } = await import("@/lib/ingest.server");
    return ingestUploadedEvidence(context.supabase, {
      userId: context.userId,
      caseId: data.caseId,
      storagePath: data.storagePath,
      originalName: data.originalName,
      contentType: data.contentType,
      sizeBytes: data.sizeBytes,
    });
  });

export const retryEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ evidenceId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { reprocessEvidence } = await import("@/lib/ingest.server");
    return reprocessEvidence(context.supabase, { userId: context.userId, evidenceId: data.evidenceId });
  });
