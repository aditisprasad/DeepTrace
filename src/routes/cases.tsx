import { createFileRoute } from "@tanstack/react-router";
import { CaseListScreen } from "@/components/deeptrace/screens";
import { routeHead } from "@/lib/deeptrace";

export const Route = createFileRoute("/cases")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? search["q"].slice(0, 200) : "",
  }),
  head: () => routeHead("Cases · DeepTrace", "Search and filter the investigations in your workspace."),
  component: CaseListRoute,
});

function CaseListRoute() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <CaseListScreen
      q={q}
      onQuery={(value) => void navigate({ to: "/cases", search: { q: value }, resetScroll: false })}
    />
  );
}
