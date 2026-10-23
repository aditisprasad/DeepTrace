import { createFileRoute } from "@tanstack/react-router";
import { RecordsScreen } from "@/components/deeptrace/workspace";
import { routeHead } from "@/lib/deeptrace";

export const Route = createFileRoute("/attack")({
  head: () => routeHead("ATT&CK Intelligence · DeepTrace", "Observed behaviors mapped to ATT&CK techniques."),
  component: () => (
    <RecordsScreen
      eyebrow="INTELLIGENCE"
      title="ATT&CK Intelligence"
      description="Analyst-recorded technique observations for your cases. Mappings are entered by analysts — nothing is invented automatically."
      table="attack_techniques"
      kind="attack_techniques"
    />
  ),
});
