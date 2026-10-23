import { createFileRoute } from "@tanstack/react-router";
import { RecordsScreen } from "@/components/deeptrace/workspace";
import { routeHead } from "@/lib/deeptrace";

export const Route = createFileRoute("/data-sources")({
  head: () => routeHead("Data Sources · DeepTrace", "Collection sources linked to your evidence."),
  component: () => (
    <RecordsScreen
      eyebrow="SYSTEM"
      title="Data Sources"
      description="Collection sources linked to evidence in your workspace, with the source URI recorded for provenance."
      table="evidence_sources"
      kind="evidence_sources"
    />
  ),
});
