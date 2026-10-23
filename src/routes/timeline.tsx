import { createFileRoute } from "@tanstack/react-router";
import { RecordsScreen } from "@/components/deeptrace/workspace";
import { routeHead } from "@/lib/deeptrace";

export const Route = createFileRoute("/timeline")({
  head: () => routeHead("Timeline · DeepTrace", "Chronological events recorded across your investigations."),
  component: () => (
    <RecordsScreen
      eyebrow="INTELLIGENCE"
      title="Timeline"
      description="Events recorded across your investigations, newest first. Events are analyst-entered records, not automated reconstruction."
      table="timeline_events"
      kind="timeline_events"
    />
  ),
});
