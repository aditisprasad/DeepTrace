import { createFileRoute } from "@tanstack/react-router";
import { RecordsScreen } from "@/components/deeptrace/workspace";
import { routeHead } from "@/lib/deeptrace";

export const Route = createFileRoute("/evidence")({
  head: () => routeHead("Evidence Vault · DeepTrace", "Evidence submitted to your organization, in collection order."),
  component: () => (
    <RecordsScreen
      eyebrow="INVESTIGATIONS"
      title="Evidence Vault"
      description="Evidence submitted to this organization, newest first. Items are unprocessed records — extraction and analysis run in later phases."
      table="evidence"
      kind="evidence"
    />
  ),
});
