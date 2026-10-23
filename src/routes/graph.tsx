import { createFileRoute } from "@tanstack/react-router";
import { GraphScreen } from "@/components/deeptrace/screens";
import { routeHead } from "@/lib/deeptrace";

export const Route = createFileRoute("/graph")({
  head: () => routeHead("Threat Graph · DeepTrace", "Relationship canvas over entity links (demonstration data)."),
  component: GraphScreen,
});
