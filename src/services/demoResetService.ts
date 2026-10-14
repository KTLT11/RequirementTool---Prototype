import { initialLayer2 } from "./requirementService";
import { initialUX, ux } from "./uxService";
import { createDemoBaseline, stageOrder, stageLabels } from "../data/cases";
import { reconcileGaps } from "./discoveryService";
import { defaultConfirmation, defaultDevReview } from "./migrationService";
import type { WorkCase, Stage } from "../types/case";
export function resetImpact(stage: Stage) {
  const index = stageOrder.indexOf(stage);
  const entities: Record<Stage, string> = {
    incoming: "Incoming Request, tên Case và toàn bộ dữ liệu kịch bản.",
    context:
      "Context facts, Known/Unknown/Assumption, complexity, hypothesis và BA review.",
    discovery:
      "Discovery responses, evidence reviews, stakeholders không được upstream dùng, gaps, clarifications và pattern validation.",
    formation:
      "Requirement Drafts, AC, links, validation, Customer Confirmation, Dev Review và snapshots về baseline; giữ Discovery/Evidence/Gaps.",
    customer: "Customer Confirmation record, Dev Review và snapshot CRD/DRD về Pending/baseline.",
    readiness: "Dev Readiness (đọc từ Quality + Confirmation hiện tại) và Dev Review về baseline.",
    handoff: "Dev Review record và snapshot DRD về baseline; giữ Customer Confirmation.",
  };
  return {
    preserved: stageOrder.slice(0, index).map((s) => stageLabels[s]),
    reset: entities[stage],
    downstream: stageOrder.slice(index + 1).map((s) => stageLabels[s]),
  };
}
// Segment ownership is explicit: context belongs to Layer 0; all responses,
// evidence, gaps/clarifications/patterns belong to Layer 1. Downstream are preview
// records, never real confirmations. Upstream objects are cloned unchanged.
export function resetDemo(c: WorkCase, stage: Stage): WorkCase {
  if (!c.isDemo) throw new Error("Reset chỉ áp dụng cho CASE-DEMO-001.");
  const base = createDemoBaseline();
  base.discovery.gaps = reconcileGaps(base);
  const result = structuredClone(c);
  const index = stageOrder.indexOf(stage);
  if (index === 0) {
    result.name = base.name;
    result.summary = base.summary;
    result.incomingRequest = base.incomingRequest;
    result.businessContext = base.businessContext;
    result.businessSource = base.businessSource;
  }
  if (index <= 1) result.context = base.context;
  if (index <= 2) result.discovery = base.discovery;
  if (index <= 3) result.layer2 = initialLayer2(true);
  if (index <= 4) {
    result.confirmation = defaultConfirmation();
    result.snapshots = result.snapshots.filter((s) => s.audience !== "CRD");
  }
  if (index <= 6) {
    result.devReview = defaultDevReview();
    result.snapshots = result.snapshots.filter((s) => s.audience !== "DRD");
  }
  if (index === 2) {
    const upstreamOwnerIds = new Set(result.context.items.map((i) => i.owner));
    for (const stakeholder of c.discovery.stakeholders)
      if (
        upstreamOwnerIds.has(stakeholder.id) &&
        !result.discovery.stakeholders.some((s) => s.id === stakeholder.id)
      )
        result.discovery.stakeholders.push(structuredClone(stakeholder));
  }
  for (const key of ["formation", "customer", "readiness", "handoff"] as const)
    if (stageOrder.indexOf(key) >= index)
      result.previews[key] = {
        ...base.previews[key],
        status:
          index === 0 || stageOrder.indexOf(key) === index
            ? "Baseline"
            : "Stale",
        sourceVersion: c.version + 1,
      };
  result.ux = structuredClone(ux(c));
  if (index === 0) result.ux = initialUX(true);
  if (index <= 2) {
    result.ux.drafts = {};
    for (const item of result.ux.extracted) item.evidenceId = null;
  }
  if (index <= 3) result.ux.correction = false;
  if (index <= 4) result.ux.customerPreview = false;
  if (index <= 6) result.ux.devPreview = false;
  if (
    !result.ux.correction &&
    !result.ux.customerPreview &&
    !result.ux.devPreview
  )
    result.ux.simulationVersion = null;
  result.ux.replayFrom = stage;
  result.currentStage = stage;
  result.status = "In Progress";
  result.version = c.version + 1;
  result.history = [
    ...c.history,
    {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      stage,
      action: `Reset Demo từ ${stageLabels[stage]}; giữ dữ liệu upstream.`,
    },
  ];
  return result;
}
