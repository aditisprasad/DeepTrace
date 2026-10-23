import { createFileRoute } from "@tanstack/react-router";
import { RecordsScreen } from "@/components/deeptrace/workspace";
import { routeHead } from "@/lib/deeptrace";

export const Route = createFileRoute("/campaigns")({
  head: () => routeHead("Campaign Intelligence · DeepTrace", "Potentially coordinated campaign assessments in your workspace."),
  component: () => (
    <RecordsScreen
      eyebrow="INTELLIGENCE"
      title="Campaign Intelligence"
      description="Potentially coordinated campaign assessments recorded in your workspace. These are analyst assessments — no attribution claims are made."
      table="campaigns"
      kind="campaigns"
    />
  ),
});
