import { uxTransition } from "./uxService";
import type { UXCommand } from "../types/ux";
import type {
  WorkCase,
  ContextAnalysis,
  Stage,
  Evidence,
  ConfirmationOutcome,
  DevReviewOutcome,
} from "../types/case";
import { questions } from "../data/questions";
import { stageOrder, emptyCase } from "../data/cases";
import {
  reconcileGaps,
  contextReady,
  discoveryReady,
  authorized,
  validResolution,
} from "./discoveryService";
import { resetDemo } from "./demoResetService";
import {
  applyLayer2,
  reconcileLayer2,
  layer2,
  requirementQuality,
} from "./requirementService";
import { buildCrdSections, buildDrdSections } from "./documentService";
export type CaseCommand =
  | { type: "layer2"; command: import("../types/requirement").Layer2Command }
  | { type: "ux"; command: UXCommand }
  | { type: "edit"; name: string; request: string }
  | { type: "context"; context: ContextAnalysis }
  | { type: "contextReview" }
  | {
      type: "suggestion";
      outcome: "Suggested" | "Accepted" | "Rejected";
      hypothesis?: string;
      inputVersion?: number;
    }
  | { type: "response"; questionId: string; text: string; sourceId: string }
  | { type: "pattern"; module: string; status: "Validated" | "Rejected" }
  | {
      type: "stakeholder";
      name: string;
      role: string;
      authority: string;
      modules: WorkCase["discovery"]["stakeholders"][number]["modules"];
    }
  | { type: "review"; evidenceId: string; review: Evidence["review"] }
  | { type: "confirm"; evidenceId: string; authorityId: string; basis: string }
  | { type: "clarify"; gapId: string; text: string; owner: string }
  | {
      type: "resolve";
      gapId: string;
      evidenceId: string;
      authorityId: string;
      basis: string;
    }
  | { type: "checkpoint" }
  | { type: "advance"; stage: Stage }
  | {
      type: "viewPreview";
      stage: "formation" | "customer" | "readiness" | "handoff";
    }
  | { type: "reset"; stage: Stage }
  | {
      type: "confirmCustomer";
      scopeReqIds: string[];
      outcome: ConfirmationOutcome;
      approverRole: string;
      approverIdentity: string;
      basis: string;
      comments?: string;
      changeRequests?: string;
    }
  | {
      type: "devReview";
      scopeReqIds: string[];
      outcome: DevReviewOutcome;
      reviewer: string;
      basis: string;
      blockers?: string;
    }
  | { type: "snapshot"; audience: "CRD" | "DRD"; scopeReqIds: string[] };
export function createCase(name: string, request: string) {
  if (!name.trim() || !request.trim())
    throw new Error("Tên Case và Incoming Request là bắt buộc.");
  const c = emptyCase(
    `CASE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    name.trim(),
    request.trim(),
  );
  c.discovery.gaps = reconcileGaps(c);
  c.history = [
    {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      stage: "incoming",
      action: "Tạo Case từ Incoming Request.",
    },
  ];
  return c;
}
function invalidate(c: WorkCase, from: Stage) {
  for (const stage of [
    "formation",
    "customer",
    "readiness",
    "handoff",
  ] as const)
    if (stageOrder.indexOf(stage) >= stageOrder.indexOf(from))
      c.previews[stage] = { status: "Stale", sourceVersion: c.version + 1 };
  if (stageOrder.indexOf(c.currentStage) > stageOrder.indexOf(from))
    c.currentStage = from;
  c.status = "In Progress";
}
export function transition(input: WorkCase, command: CaseCommand): WorkCase {
  const next =
    command.type === "layer2"
      ? applyLayer2(input, command.command)
      : coreTransition(input, command);
  return reconcileLayer2(input, next);
}
function coreTransition(
  input: WorkCase,
  command: Exclude<CaseCommand, { type: "layer2" }>,
): WorkCase {
  if (command.type === "ux") return uxTransition(input, command.command);
  if (command.type === "reset") return resetDemo(input, command.stage);
  const c = structuredClone(input);
  let action = "";
  let stage: Stage = "discovery";
  switch (command.type) {
    case "edit":
      if (!command.name.trim() || !command.request.trim())
        throw new Error("Tên và request không được để trống.");
      c.name = command.name.trim();
      if (c.incomingRequest !== command.request.trim()) {
        c.incomingRequest = command.request.trim();
        c.summary = c.incomingRequest.slice(0, 120);
        c.context.reviewed = false;
        c.context.reassessmentRequired = true;
        invalidate(c, "context");
      }
      action = "Cập nhật thông tin Case.";
      stage = "incoming";
      break;
    case "context":
      c.context = structuredClone(command.context);
      if (c.context.hypothesis !== input.context.hypothesis)
        c.context.hypothesisProvenance = "BA-entered Information";
      if (
        c.context.complexityReason !== input.context.complexityReason ||
        JSON.stringify(c.context.complexity) !==
          JSON.stringify(input.context.complexity)
      )
        c.context.complexityProvenance = "BA-entered Information";
      c.context.reviewed = false;
      c.context.reassessmentRequired = false;
      c.discovery.checkpointRun = false;
      invalidate(c, "context");
      action = "Điều chỉnh Context Assessment.";
      stage = "context";
      break;
    case "contextReview":
      if (
        !c.context.items.every(
          (i) =>
            i.text.trim() &&
            (i.certainty === "Known" || (i.owner && i.nextAction.trim())),
        )
      )
        throw new Error(
          "Ghi nhận nội dung, owner và follow-up cho Unknown/Assumption trước khi review.",
        );
      c.context.reviewed = true;
      c.context.reassessmentRequired = false;
      action = "BA review Context; không tự xác nhận evidence.";
      stage = "context";
      break;
    case "suggestion":
      if (
        command.inputVersion !== undefined &&
        command.inputVersion !== input.version
      )
        throw new Error("Nguồn đã thay đổi; chạy phân tích lại.");
      c.context.suggestionStatus = command.outcome;
      c.context.reviewed = false;
      c.discovery.checkpointRun = false;
      invalidate(c, "context");
      if (command.hypothesis) {
        c.context.hypothesis = command.hypothesis;
        c.context.hypothesisProvenance = "Simulated Suggestion";
        c.context.reviewed = false;
        invalidate(c, "context");
      }
      action = `Discovery hypothesis: ${command.outcome}.`;
      stage = "context";
      break;
    case "response": {
      if (!questions.some((q) => q.id === command.questionId))
        throw new Error("Question không hợp lệ.");
      const response = c.discovery.responses.find(
        (r) => r.questionId === command.questionId,
      )!;
      const previous = c.discovery.evidence.find(
        (e) => e.id === response.evidenceId,
      );
      if (previous) previous.status = "Superseded";
      const evidenceId = command.text.trim()
        ? `EVI-${crypto.randomUUID()}`
        : null;
      Object.assign(response, {
        text: command.text.trim(),
        source: command.sourceId,
        provenance: "BA-entered Information",
        evidenceId,
      });
      if (evidenceId)
        c.discovery.evidence.push({
          id: evidenceId,
          questionId: response.questionId,
          statement: response.text,
          sourceId: command.sourceId,
          provenance: "BA-entered Information",
          review: "Pending Review",
          status: "Unconfirmed",
          version: (previous?.version ?? 0) + 1,
          reviewedBy: "",
          basis: "",
          authorityId: "",
        });
      const gap = c.discovery.gaps.find(
        (g) => g.questionId === command.questionId,
      );
      if (gap) gap.resolution = null;
      c.discovery.checkpointRun = false;
      if (["RULE-Q-06", "INT-Q-13", "EXC-Q-08"].includes(command.questionId))
        c.context.reassessmentRequired = true;
      invalidate(c, "discovery");
      action = `Cập nhật ${command.questionId}; evidence mới chờ review.`;
      break;
    }
    case "pattern": {
      const p = c.discovery.patterns.find((p) => p.module === command.module);
      if (!p) throw new Error("Module không hợp lệ.");
      p.status = command.status;
      c.discovery.checkpointRun = false;
      invalidate(c, "discovery");
      action = `BA ${command.status} pattern ${command.module}.`;
      break;
    }
    case "stakeholder":
      if (
        !command.name.trim() ||
        !command.authority.trim() ||
        !command.modules.length
      )
        throw new Error("Cung cấp tên, authority và module phụ trách.");
      c.discovery.stakeholders.push({
        id: `ST-${crypto.randomUUID()}`,
        name: command.name.trim(),
        role: command.role.trim(),
        authority: command.authority.trim(),
        modules: command.modules,
        provenance: "BA-entered Information",
      });
      action = "Ghi nhận stakeholder và authority.";
      break;
    case "review": {
      const e = c.discovery.evidence.find((e) => e.id === command.evidenceId);
      if (!e || e.status === "Superseded")
        throw new Error("Evidence không còn hiện hành.");
      e.review = command.review;
      e.reviewedBy = "BA";
      if (e.review !== "Reviewed") {
        e.status = "Unconfirmed";
        e.authorityId = "";
        e.basis = "";
      }
      invalidate(c, "discovery");
      action = `Evidence ${e.id}: ${e.review}; status giữ riêng.`;
      break;
    }
    case "confirm": {
      const e = c.discovery.evidence.find((e) => e.id === command.evidenceId);
      if (
        !e ||
        e.status === "Superseded" ||
        e.review !== "Reviewed" ||
        !authorized(c, e, command.authorityId) ||
        !command.basis.trim()
      )
        throw new Error(
          "Cần Reviewed, đúng nguồn có authority của module và căn cứ xác nhận.",
        );
      e.status = "Confirmed";
      e.authorityId = command.authorityId;
      e.basis = command.basis.trim();
      invalidate(c, "discovery");
      action = `Ghi nhận căn cứ xác nhận evidence ${e.id}.`;
      break;
    }
    case "clarify": {
      const g = c.discovery.gaps.find((g) => g.id === command.gapId);
      if (!g || !command.text.trim() || !command.owner)
        throw new Error("Cần clarification và owner.");
      g.clarifications.push({
        id: crypto.randomUUID(),
        text: command.text.trim(),
        owner: command.owner,
        date: new Date().toISOString(),
      });
      action = `Thêm clarification cho ${g.id}; chưa đóng Gap.`;
      break;
    }
    case "resolve": {
      const g = c.discovery.gaps.find((g) => g.id === command.gapId);
      const e = c.discovery.evidence.find((e) => e.id === command.evidenceId);
      if (!g || !e || e.questionId !== g.questionId)
        throw new Error("Evidence phải liên kết đúng Gap.");
      const record = {
        evidenceId: e.id,
        authorityId: command.authorityId,
        basis: command.basis.trim(),
        sourceVersions: g.evidenceIds.map((id) => {
          const e = c.discovery.evidence.find((e) => e.id === id)!;
          return `${e.id}@${e.version}`;
        }),
      };
      if (!validResolution(c, record))
        throw new Error(
          "Chưa đủ căn cứ: cần evidence Reviewed + Confirmed và đúng authority; không thể đóng Gap bằng text đơn thuần.",
        );
      g.resolution = record;
      const r = c.discovery.responses.find(
        (r) => r.questionId === g.questionId,
      )!;
      Object.assign(r, {
        text: e.statement,
        evidenceId: e.id,
        source: e.sourceId,
        provenance: e.provenance,
      });
      invalidate(c, "discovery");
      action = `Giải quyết ${g.id} theo quyết định có authority; giữ các nguồn.`;
      break;
    }
    case "checkpoint":
      c.discovery.checkpointRun = true;
      action = "Chạy Discovery completeness checks cho phạm vi đã chọn.";
      break;
    case "advance":
      if (command.stage === "discovery" && !contextReady(c))
        throw new Error("Context chưa Ready.");
      if (command.stage === "formation" && !discoveryReady(c))
        throw new Error("Information Complete chưa đạt.");
      if (!["discovery", "formation"].includes(command.stage))
        throw new Error("Các bước sau chỉ là preview.");
      c.currentStage = command.stage;
      action = `Chuyển xử lý sang ${command.stage}.`;
      stage = command.stage;
      break;
    case "viewPreview":
      c.previews[command.stage] = {
        status: "Viewed",
        sourceVersion: c.version,
      };
      action = `Đã xem preview ${command.stage}; không ghi nhận approval.`;
      stage = command.stage;
      break;
    case "confirmCustomer": {
      const ids = [...new Set(command.scopeReqIds)];
      const active = layer2(c).requirements.filter((r) => r.status !== "Archived");
      if (!ids.length || ids.some((id) => !active.some((r) => r.id === id)))
        throw new Error("Chọn Requirement active hợp lệ cho confirmation scope.");
      if (
        ids.some((id) => requirementQuality(c, id) === "Not Executed")
      )
        throw new Error(
          "Requirement trong scope chưa từng chạy validation; chạy Quality check trước khi gửi Customer review.",
        );
      if (command.outcome !== "Pending" && !command.basis.trim())
        throw new Error("Cần căn cứ (basis) khi ghi nhận kết quả xác nhận.");
      if (
        (command.outcome === "Confirmed" ||
          command.outcome === "Partially Confirmed") &&
        (!command.approverRole.trim() || !command.approverIdentity.trim())
      )
        throw new Error("Cần approver role và identity khi Confirmed/Partially Confirmed.");
      c.confirmation = {
        scopeReqIds: ids,
        outcome: command.outcome,
        approverRole: command.approverRole.trim(),
        approverIdentity: command.approverIdentity.trim(),
        basis: command.basis.trim(),
        date: command.outcome === "Pending" ? null : new Date().toISOString(),
        snapshotId: c.confirmation.snapshotId,
        comments: command.comments?.trim() ?? "",
        changeRequests: command.changeRequests?.trim() ?? "",
      };
      c.previews.customer = { status: "Viewed", sourceVersion: c.version };
      invalidate(c, "readiness");
      action = `Customer Confirmation: ${command.outcome} cho ${ids.length} Requirement; không tự Quality Ready/Dev Ready.`;
      stage = "customer";
      break;
    }
    case "devReview": {
      const ids = [...new Set(command.scopeReqIds)];
      const active = layer2(c).requirements.filter((r) => r.status !== "Archived");
      if (!ids.length || ids.some((id) => !active.some((r) => r.id === id)))
        throw new Error("Chọn Requirement active hợp lệ cho Dev Review scope.");
      const confirmedScope =
        (c.confirmation.outcome === "Confirmed" ||
          c.confirmation.outcome === "Partially Confirmed") &&
        ids.every((id) => c.confirmation.scopeReqIds.includes(id));
      if (!confirmedScope)
        throw new Error(
          "Dev Review chỉ áp dụng cho scope đã Customer Confirmed/Partially Confirmed; Dev Review không thay Customer Confirmation.",
        );
      if (!command.basis.trim())
        throw new Error("Cần căn cứ (basis) khi ghi nhận Dev Review.");
      c.devReview = {
        scopeReqIds: ids,
        outcome: command.outcome,
        reviewer: command.reviewer.trim(),
        basis: command.basis.trim(),
        date: command.outcome === "Pending" ? null : new Date().toISOString(),
        snapshotId: c.devReview.snapshotId,
        blockers: command.blockers?.trim() ?? "",
      };
      c.previews.handoff = { status: "Viewed", sourceVersion: c.version };
      action = `Dev Review: ${command.outcome} cho ${ids.length} Requirement; Accepted with Blocker không phải Implementation Unblocked.`;
      stage = "handoff";
      break;
    }
    case "snapshot": {
      const ids = [...new Set(command.scopeReqIds)];
      const active = layer2(c).requirements.filter((r) => r.status !== "Archived");
      if (!ids.length || ids.some((id) => !active.some((r) => r.id === id)))
        throw new Error("Chọn scope hợp lệ trước khi tạo snapshot.");
      const sections =
        command.audience === "CRD"
          ? buildCrdSections(c, ids)
          : buildDrdSections(c, ids);
      const snapshotId = `SNAP-${command.audience}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      c.snapshots.push({
        id: snapshotId,
        audience: command.audience,
        version: c.version,
        scopeReqIds: ids,
        sections,
        createdAt: new Date().toISOString(),
      });
      if (command.audience === "CRD") c.confirmation.snapshotId = snapshotId;
      else c.devReview.snapshotId = snapshotId;
      action = `Tạo snapshot ${command.audience} ${snapshotId} · scope ${ids.length} Requirement · immutable.`;
      stage = command.audience === "CRD" ? "customer" : "handoff";
      break;
    }
  }
  if (
    ["context", "contextReview", "suggestion"].includes(command.type) &&
    c.currentStage === "incoming"
  )
    c.currentStage = "context";
  c.discovery.gaps = reconcileGaps(c);
  if (command.type !== "viewPreview") {
    c.version++;
    if (c.ux) {
      c.ux.correction = false;
      c.ux.customerPreview = false;
      c.ux.devPreview = false;
      c.ux.simulationVersion = null;
      c.ux.replayFrom = null;
    }
  }
  c.history.push({
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    stage,
    action,
  });
  return c;
}
