import { createFileRoute } from "@tanstack/react-router";
import { CaseDetailScreen } from "@/components/deeptrace/screens";
import { routeHead } from "@/lib/deeptrace";

export const Route = createFileRoute("/cases/$caseId")({
  head: () => routeHead("Case Workspace · DeepTrace", "Investigation detail with evidence, timeline, and audit trail."),
  component: CaseDetailRoute,
});

function CaseDetailRoute() {
  const { caseId } = Route.useParams();
  return <CaseDetailScreen caseId={caseId} />;
}
