import type { WorkCase } from "../types/case";
import type { UXState, UXCommand } from "../types/ux";
import { questions } from "../data/questions";
import { reconcileGaps } from "./discoveryService";
import { transition } from "./caseTransitions";
export function initialUX(isDemo: boolean): UXState {
  const documents = isDemo
    ? [
        {
          id: "DOC-CS",
          name: "Customer Service — refund notes (demo).txt",
          type: "TXT",
          source: "Customer Service · Demo Scenario",
          sourceId: "ST-CS",
          status: "Demo sample" as const,
          text: "Hoàn tiền trong 14 ngày sau thanh toán; giao dịch đã trả tiền và chưa hoàn tiền.",
          uploadedAt: "",
        },
        {
          id: "DOC-POL",
          name: "Refund Policy — proposed rule (demo).txt",
          type: "TXT",
          source: "Policy Owner · Demo Scenario",
          sourceId: "ST-POL",
          status: "Demo sample" as const,
          text: "Chính sách đề xuất là 30 ngày sau thanh toán; giao dịch đã trả tiền và chưa hoàn tiền.",
          uploadedAt: "",
        },
      ]
    : [];
  return {
    documents,
    extracted: documents.map((d, i) => ({
      id: `EXT-${i + 1}`,
      documentId: d.id,
      reference: "Đoạn 1 · tài liệu mẫu",
      excerpt: d.text,
      value: i ? "30 ngày" : "14 ngày",
      interpretation: d.text,
      questionId: "RULE-Q-06",
      status: "Pending Review",
      evidenceId: null,
    })),
    drafts: {},
    correction: false,
    customerPreview: false,
    devPreview: false,
    simulationVersion: null,
    replayFrom: null,
  };
}
export function ux(c: WorkCase): UXState {
  return c.ux ?? initialUX(c.isDemo);
}
export function uxTransition(input: WorkCase, command: UXCommand): WorkCase {
  let c = structuredClone(input);
  c.ux = structuredClone(ux(input));
  const u = c.ux;
  if (command.op === "draft") {
    u.drafts[command.questionId] = {
      text: command.text,
      source: command.source,
    };
    return c;
  }
  if (command.op === "save") {
    const d = u.drafts[command.questionId];
    if (!d) throw new Error("Chưa có draft mới.");
    c = transition(c, {
      type: "response",
      questionId: command.questionId,
      text: d.text,
      sourceId: d.source,
    });
    delete c.ux!.drafts[command.questionId];
    return c;
  }
  if (["correction", "customer", "dev"].includes(command.op)) {
    const cmd = command as Extract<UXCommand, { value: boolean }>;
    if (cmd.op === "correction") {
      throw new Error(
        "Quality correction dùng Requirement/AC editor và validation thật ở Layer 2.",
      );
    }
    if (cmd.op === "customer") {
      if (cmd.value && !c.layer2?.runs.length)
        throw new Error("Chạy Layer 2 validation trước cảnh Customer preview.");
      u.customerPreview = cmd.value;
      u.devPreview = false;
    }
    if (cmd.op === "dev") {
      if (cmd.value && !u.customerPreview)
        throw new Error("Xem cảnh Customer review trước Dev Acceptance.");
      u.devPreview = cmd.value;
    }
    u.simulationVersion = c.version;
    return c;
  }
  if (command.op === "document") {
    if (!command.document.name.trim()) throw new Error("Thiếu tên tài liệu.");
    u.documents.push(command.document);
  }
  if (command.op === "deleteDocument") {
    const d = u.documents.find((d) => d.id === command.id);
    if (!d) throw new Error("Không tìm thấy tài liệu.");
    const linked = u.extracted.filter(
      (i) => i.documentId === command.id && i.evidenceId,
    );
    if (linked.length)
      throw new Error(
        "Tài liệu đã có Evidence liên kết; không thể xóa để giữ traceability.",
      );
    u.documents = u.documents.filter((x) => x.id !== command.id);
    u.extracted = u.extracted.filter((i) => i.documentId !== command.id);
  }
  if (command.op === "extracted") {
    const i = u.extracted.find((i) => i.id === command.id);
    if (!i) throw new Error("Không tìm thấy nội dung.");
    if (!command.interpretation.trim())
      throw new Error("Cần nội dung diễn giải.");
    if (
      i.evidenceId &&
      (i.interpretation !== command.interpretation ||
        command.status === "Rejected")
    ) {
      const previous = c.discovery.evidence.find((e) => e.id === i.evidenceId);
      if (previous) previous.status = "Superseded";
      i.evidenceId = null;
      c.discovery.checkpointRun = false;
    }
    i.interpretation = command.interpretation;
    i.status = command.status;
  }
  if (command.op === "link") {
    const i = u.extracted.find((i) => i.id === command.id),
      q = questions.find((q) => q.id === command.questionId);
    if (!i || !q || i.status !== "Accepted")
      throw new Error("Review và chấp nhận diễn giải trước khi liên kết.");
    const d = u.documents.find((d) => d.id === i.documentId)!;
    if (i.evidenceId)
      throw new Error(
        "Nội dung đã liên kết; điều chỉnh diễn giải nếu cần tạo phiên bản mới.",
      );
    const earlier = c.discovery.evidence.filter(
      (e) =>
        e.questionId === q.id &&
        e.sourceId === d.sourceId &&
        e.status !== "Superseded",
    );
    const version = Math.max(0, ...earlier.map((e) => e.version)) + 1;
    for (const old of earlier) old.status = "Superseded";
    const id = `EVI-${crypto.randomUUID()}`;
    c.discovery.evidence.push({
      id,
      questionId: q.id,
      statement: i.interpretation,
      sourceId: d.sourceId,
      provenance: "Demo Scenario",
      review: "Pending Review",
      status: "Unconfirmed",
      version,
      reviewedBy: "",
      basis: "",
      authorityId: "",
      documentId: d.id,
      extractedId: i.id,
    });
    const response = c.discovery.responses.find((r) => r.questionId === q.id)!;
    Object.assign(response, {
      text: i.interpretation,
      source: d.sourceId,
      provenance: "Demo Scenario",
      evidenceId: id,
    });
    i.evidenceId = id;
    i.questionId = q.id;
    const gap = c.discovery.gaps.find((g) => g.questionId === q.id);
    if (gap) gap.resolution = null;
    c.discovery.checkpointRun = false;
  }
  c.version++;
  for (const key of ["formation", "customer", "readiness", "handoff"] as const)
    c.previews[key] = { status: "Stale", sourceVersion: c.version };
  u.correction = false;
  u.customerPreview = false;
  u.devPreview = false;
  u.simulationVersion = null;
  c.discovery.gaps = reconcileGaps(c);
  c.history.push({
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    stage: "incoming",
    action: `Nguồn thông tin: ${command.op}; không tự Confirmed.`,
  });
  return c;
}

export function sceneForStage(
  stage: import("../types/case").Stage | null,
): number {
  return stage === null
    ? 0
    : {
        incoming: 0,
        context: 2,
        discovery: 3,
        formation: 6,
        customer: 9,
        readiness: 10,
        handoff: 11,
      }[stage];
}
