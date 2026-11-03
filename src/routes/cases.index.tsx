import { createFileRoute } from "@tanstack/react-router";
import { CaseListScreen } from "@/components/deeptrace/screens";
import { routeHead } from "@/lib/deeptrace";

// `q` is optional: it only appears in the URL while a search filter is active.
export const Route = createFileRoute("/cases/")({
  validateSearch: (search: Record<string, unknown>) => {
    const raw = search["q"];
    return typeof raw === "string" && raw.trim().length > 0
      ? { q: raw.trim().slice(0, 200) }
      : {};
  },
  head: () => routeHead("Cases · DeepTrace", "Search and filter the investigations in your workspace."),
  component: CaseListRoute,
});

function CaseListRoute() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <CaseListScreen
      q={q ?? ""}
      onQuery={(value) =>
        void navigate({
          to: "/cases",
          search: value.trim() ? { q: value.trim().slice(0, 200) } : {},
          resetScroll: false,
        })
      }
    />
  );
}
