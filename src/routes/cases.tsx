import { createFileRoute } from "@tanstack/react-router";
import { routeHead } from "@/lib/deeptrace";

// Layout route for /cases — renders its children (/cases, /cases/new, /cases/$caseId)
// through the default Outlet. The searchable list itself lives in cases.index.tsx.
export const Route = createFileRoute("/cases")({
  head: () => routeHead("Cases · DeepTrace", "Search and filter the investigations in your workspace."),
});
