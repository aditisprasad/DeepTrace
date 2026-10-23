import { createFileRoute } from "@tanstack/react-router";
import { ReportsScreen } from "@/components/deeptrace/screens";
import { routeHead } from "@/lib/deeptrace";

export const Route = createFileRoute("/reports")({
  head: () => routeHead("Reports · DeepTrace", "Structured reporting over findings and evidence."),
  component: ReportsScreen,
});
