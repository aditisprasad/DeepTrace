import { createFileRoute } from "@tanstack/react-router";
import { EvidenceVaultScreen } from "@/components/deeptrace/evidence-vault";
import { routeHead } from "@/lib/deeptrace";

export const Route = createFileRoute("/evidence")({
  head: () => routeHead("Evidence Vault · DeepTrace", "Evidence intake, processing state, and provenance for your organization."),
  component: EvidenceVaultScreen,
});
