import { createFileRoute } from "@tanstack/react-router";
import { RecordsScreen } from "@/components/deeptrace/workspace";
import { routeHead } from "@/lib/deeptrace";

export const Route = createFileRoute("/findings")({
  head: () => routeHead("Findings · DeepTrace", "Draft and reviewed investigation findings."),
  component: () => (
    <RecordsScreen
      eyebrow="REPORTING"
      title="Findings"
      description="Findings recorded in your workspace, in review order. Each finding carries its own confidence, evidence, and limitations."
      table="findings"
      kind="findings"
    />
  ),
});
