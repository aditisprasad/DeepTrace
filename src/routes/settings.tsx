import { createFileRoute } from "@tanstack/react-router";
import { SettingsScreen } from "@/components/deeptrace/screens";
import { routeHead } from "@/lib/deeptrace";

export const Route = createFileRoute("/settings")({
  head: () => routeHead("Settings · DeepTrace", "Workspace identity and access model for your account."),
  component: SettingsScreen,
});
