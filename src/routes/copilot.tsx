import { createFileRoute } from "@tanstack/react-router";
import { CopilotScreen } from "@/components/deeptrace/screens";
import { routeHead } from "@/lib/deeptrace";

export const Route = createFileRoute("/copilot")({
  head: () => routeHead("Investigation Copilot · DeepTrace", "Evidence-grounded question answering for investigations."),
  component: CopilotScreen,
});
