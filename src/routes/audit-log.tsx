import { createFileRoute } from "@tanstack/react-router";
import { RecordsScreen } from "@/components/deeptrace/workspace";
import { routeHead } from "@/lib/deeptrace";

export const Route = createFileRoute("/audit-log")({
  head: () => routeHead("Audit Log · DeepTrace", "Organization audit trail of recorded actions."),
  component: () => (
    <RecordsScreen
      eyebrow="SYSTEM"
      title="Audit Log"
      description="Recorded actions across your organization, newest first."
      table="audit_logs"
      kind="audit_logs"
    />
  ),
});
