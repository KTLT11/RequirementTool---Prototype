import type { WorkCase, Stage } from "../../types/case";
import { RequirementWorkspace } from "./RequirementWorkspace";
import { ConfirmationHandoff } from "./V2Workspace";
// Compatibility adapter: Layer 2 always uses the real shared editor/engine.
export function DownstreamPreview({
  workCase,
  stage,
}: {
  workCase: WorkCase;
  stage: Exclude<Stage, "incoming" | "context" | "discovery">;
}) {
  return stage === "formation" ? (
    <RequirementWorkspace workCase={workCase} />
  ) : (
    <ConfirmationHandoff workCase={workCase} handoff={stage !== "customer"} />
  );
}
