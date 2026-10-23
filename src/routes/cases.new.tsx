import { createFileRoute } from "@tanstack/react-router";
import { NewCaseScreen } from "@/components/deeptrace/screens";
import { routeHead } from "@/lib/deeptrace";

export const Route = createFileRoute("/cases/new")({
  head: () => routeHead("New Investigation · DeepTrace", "Register a new investigation for your organization."),
  component: NewCaseScreen,
});
