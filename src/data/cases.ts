import type { WorkCase, ContextAnalysis, Stage } from "../types/case";
import { questions } from "./questions";
import { defaultConfirmation, defaultDevReview } from "../services/migrationService";
export const DEMO_CASE_ID = "CASE-DEMO-001";
export const stageOrder: Stage[] = [
  "incoming",
  "context",
  "discovery",
  "formation",
  "customer",
  "readiness",
  "handoff",
];
export const stageLabels: Record<Stage, string> = {
  incoming: "Incoming Request",
  context: "Layer 0 — Context Analysis",
  discovery: "Layer 1 — Discovery",
  formation: "Layer 2 — Requirement & Quality",
  customer: "Customer Confirmation",
  readiness: "Layer 3 — Dev Readiness",
  handoff: "Dev Handoff / Documents",
};
export function emptyContext(): ContextAnalysis {
  return {
    items: [
      ["need", "Business problem / need"],
      ["current", "Current state"],
      ["target", "Desired outcome"],
      ["scope", "Scope"],
      ["actors", "Stakeholders / actors"],
      ["constraints", "Constraints"],
      ["dependencies", "Dependencies"],
      ["assumption", "Assumption"],
    ].map(([id, label]) => ({
      id,
      label,
      text: "",
      certainty: "Unknown",
      provenance: "BA-entered Information",
      owner: "",
      nextAction: "",
    })),
    reviewed: false,
    complexity: ["Medium", "Medium", "High"],
    complexityReason: "Chưa đủ thông tin đánh giá.",
    complexityProvenance: "BA-entered Information",
    hypothesis: "",
    hypothesisProvenance: "BA-entered Information",
    suggestionStatus: "Not generated",
    reassessmentRequired: false,
  };
}
export function emptyCase(id: string, name: string, request: string): WorkCase {
  return {
    id,
    name,
    summary: request.slice(0, 120),
    incomingRequest: request,
    status: "In Progress",
    businessContext: null,
    businessSource: null,
    isDemo: false,
    currentStage: "context",
    version: 1,
    context: emptyContext(),
    discovery: {
      responses: questions.map((q) => ({
        questionId: q.id,
        text: "",
        source: "",
        provenance: "BA-entered Information",
        evidenceId: null,
      })),
      evidence: [],
      gaps: [],
      stakeholders: [],
      patterns: ["Process", "Business Rule", "Integration", "Exception"].map(
        (module) => ({ module: module as "Process", status: "Suggested" }),
      ),
      checkpointRun: false,
    },
    previews: {
      formation: { status: "Baseline", sourceVersion: 1 },
      customer: { status: "Baseline", sourceVersion: 1 },
      readiness: { status: "Baseline", sourceVersion: 1 },
      handoff: { status: "Baseline", sourceVersion: 1 },
    },
    confirmation: defaultConfirmation(),
    devReview: defaultDevReview(),
    snapshots: [],
    history: [],
  };
}
export function createDemoBaseline(): WorkCase {
  const c = emptyCase(
    DEMO_CASE_ID,
    "Refund Request Processing Improvement",
    "Khách hàng muốn cải thiện quy trình hoàn tiền để giảm việc xử lý thủ công. Hệ thống cần kiểm tra điều kiện hoàn tiền, chuyển thông tin sang hệ thống thanh toán khi đủ điều kiện và cho phép theo dõi trạng thái xử lý.",
  );
  c.isDemo = true;
  c.currentStage = "incoming";
  c.summary = "Cải thiện quy trình hoàn tiền và giảm xử lý thủ công.";
  c.context.items = c.context.items.map((item) => ({
    ...item,
    provenance: "Demo Scenario",
    owner:
      item.id === "constraints"
        ? "ST-POL"
        : ["dependencies", "assumption"].includes(item.id)
          ? "ST-INT"
          : "ST-OPS",
    nextAction: "Xác minh trong discovery.",
  }));
  const values: Record<string, string> = {
    need: "Giảm thao tác kiểm tra và theo dõi hoàn tiền thủ công.",
    current:
      "CS tiếp nhận, Operations kiểm tra điều kiện và gửi thông tin thanh toán thủ công.",
    target:
      "Kiểm tra điều kiện, chuyển yêu cầu đủ điều kiện và theo dõi kết quả.",
    scope: "Refund request processing; không thay đổi chính sách hoàn tiền.",
    actors:
      "Customer Service, Operations, Policy Owner, Payment Integration Owner.",
    constraints: "Thời hạn đủ điều kiện hoàn tiền chưa thống nhất.",
    dependencies:
      "Phụ thuộc contract và khả năng phản hồi của hệ thống thanh toán.",
    assumption: "Hệ thống thanh toán hỗ trợ kiểm tra kết quả bằng request ID.",
  };
  c.context.items = c.context.items.map((item) => ({
    ...item,
    text: values[item.id],
    certainty:
      item.id === "assumption"
        ? "Assumption"
        : ["constraints", "dependencies"].includes(item.id)
          ? "Unknown"
          : "Known",
    provenance: ["need", "target"].includes(item.id)
      ? "Incoming Request"
      : item.id === "assumption"
        ? "Assumption"
        : "Demo Scenario",
  }));
  c.context.complexityReason =
    "Nhiều actor, process/rule/integration phụ thuộc nhau; chính sách 14/30 ngày có conflict.";
  c.context.complexity = ["Medium", "High", "High"];
  c.context.complexityProvenance = "Demo Scenario";
  c.context.hypothesisProvenance = "Simulated Suggestion";
  c.context.hypothesis =
    "Process là backbone; Business Rule, Integration và Exception cần làm rõ điều kiện, dữ liệu và kết quả chưa biết.";
  c.context.suggestionStatus = "Suggested";
  c.discovery.stakeholders = [
    {
      id: "ST-OPS",
      name: "Operations representative",
      role: "Process Owner",
      authority: "Xác minh quy trình và actor xử lý.",
      modules: ["Core", "Process"],
      provenance: "Demo Scenario",
    },
    {
      id: "ST-POL",
      name: "Refund Policy Owner",
      role: "Policy Owner",
      authority: "Quyết định điều kiện và thời hạn hoàn tiền.",
      modules: ["Business Rule"],
      provenance: "Demo Scenario",
    },
    {
      id: "ST-CS",
      name: "Customer Service representative",
      role: "Customer Service",
      authority: "Cung cấp tình huống; không quyết định chính sách.",
      modules: ["Core"],
      provenance: "Demo Scenario",
    },
    {
      id: "ST-INT",
      name: "Payment Integration Owner",
      role: "Integration Owner",
      authority: "Xác minh data exchange, unknown outcome và recovery.",
      modules: ["Integration", "Exception"],
      provenance: "Demo Scenario",
    },
  ];
  const seed = [
    [
      "EVI-01",
      "CORE-Q-01",
      "Hiện nhiều bước kiểm tra và cập nhật trạng thái hoàn tiền được xử lý thủ công.",
      "ST-OPS",
      "Reviewed",
    ],
    [
      "EVI-02",
      "CORE-Q-02",
      "CS tiếp nhận; Operations xử lý; Policy Owner xác nhận chính sách.",
      "ST-OPS",
      "Reviewed",
    ],
    [
      "EVI-03",
      "PROC-Q-01",
      "Bắt đầu khi khách gửi yêu cầu; kết thúc khi có kết quả hoàn tiền hoặc từ chối có lý do.",
      "ST-OPS",
      "Reviewed",
    ],
    [
      "EVI-04",
      "PROC-Q-09",
      "Tiếp nhận → kiểm tra điều kiện → gửi thanh toán nếu đủ điều kiện → theo dõi kết quả.",
      "ST-OPS",
      "Pending Review",
    ],
    [
      "EVI-14",
      "RULE-Q-06",
      "Hoàn tiền trong 14 ngày sau thanh toán; giao dịch đã trả tiền và chưa hoàn tiền.",
      "ST-CS",
      "Reviewed",
    ],
    [
      "EVI-30",
      "RULE-Q-06",
      "Chính sách đề xuất là 30 ngày sau thanh toán; giao dịch đã trả tiền và chưa hoàn tiền.",
      "ST-POL",
      "Pending Review",
    ],
  ];
  c.discovery.evidence = seed.map(
    ([id, questionId, statement, sourceId, review]) => ({
      id,
      questionId,
      statement,
      sourceId,
      provenance: "Demo Scenario",
      review: review as "Reviewed" | "Pending Review",
      status: "Unconfirmed",
      version: 1,
      reviewedBy: review === "Reviewed" ? "BA (kịch bản)" : "",
      basis: "",
      authorityId: "",
    }),
  );
  c.discovery.responses = c.discovery.responses.map((r) => {
    const e = c.discovery.evidence.find((e) => e.questionId === r.questionId);
    return e
      ? {
          ...r,
          text: e.statement,
          source: e.sourceId,
          provenance: "Demo Scenario",
          evidenceId: e.id,
        }
      : r;
  });
  return c;
}
export const demoCases: WorkCase[] = [createDemoBaseline()];
