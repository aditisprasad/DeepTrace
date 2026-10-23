import { createFileRoute } from "@tanstack/react-router";
import { CommandCenterScreen } from "@/components/deeptrace/screens";
import { routeHead } from "@/lib/deeptrace";

export const Route = createFileRoute("/")({
  head: () => routeHead("DeepTrace · Command Center", "Live overview of your organization's investigations, evidence, and findings."),
  component: CommandCenterScreen,
});
