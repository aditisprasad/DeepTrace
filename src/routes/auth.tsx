import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/deeptrace/screens";
import { routeHead } from "@/lib/deeptrace";

export const Route = createFileRoute("/auth")({
  head: () => routeHead("Sign in · DeepTrace", "Sign in to your secure DeepTrace investigation workspace."),
  component: AuthScreen,
});
