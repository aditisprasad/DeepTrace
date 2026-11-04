import { createFileRoute } from "@tanstack/react-router";
import { PhishGraphScreen } from "@/components/deeptrace/phish-graph";
import { routeHead } from "@/lib/deeptrace";

export const Route = createFileRoute("/graph")({
  head: () => routeHead("PhishGraph · DeepTrace", "Interactive graph of evidence-backed entities and recorded relationships in your workspace."),
  component: PhishGraphScreen,
});
