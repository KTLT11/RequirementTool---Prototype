import { layer2, qualitySummary } from "./requirementService";
import type { WorkCase, Stage } from "../types/case";
import { contextReady, discoveryReady } from "./discoveryService";
export function sampleSpec(c: WorkCase) {
  const gap = c.discovery.gaps.find((g) => g.questionId === "RULE-Q-06");
  const r = c.discovery.responses.find((r) => r.questionId === "RULE-Q-06");
  const rule =
    gap?.status === "Resolved"
      ? (r?.text ?? "Chưa xác định.")
      : (gap?.description ?? r?.text ?? "Chưa xác định điều kiện hoàn tiền.");
  const data =
    c.discovery.responses.find((r) => r.questionId === "INT-Q-07")?.text ||
    "Dữ liệu trao đổi chưa được xác minh.";
  const canonical = layer2(c)
    .requirements.filter((r) => r.status !== "Archived")
    .map((r) => ({
      id: r.id,
      title: r.title,
      behavior: r.statement,
      ac: r.ac.map((a) => `${a.id}: ${a.condition} → ${a.outcome}`).join("\n"),
      dependency: [r.fields.dependency, ...r.relatedIds]
        .filter(Boolean)
        .join("; "),
    }));
  return {
    rule,
    data,
    requirements: canonical,
    blocker:
      "DEP-PAYMENT-CONTRACT: contract của hệ thống thanh toán chưa được cung cấp/xác nhận; owner là Payment Integration Owner.",
  };
}
export function workflowDetails(c: WorkCase, stage: Stage) {
  if (
    !c.isDemo &&
    ["formation", "customer", "readiness", "handoff"].includes(stage)
  )
    return {
      input: c.incomingRequest,
      processing:
        "Chưa có requirement hoặc tài liệu được hình thành cho Case này.",
      output: "Chưa có kết quả của bước này.",
      action:
        "BA tiếp tục khai thác thông tin và evidence trước khi chuẩn bị requirement.",
      next: "Hoàn tất các thông tin nghiệp vụ áp dụng; không sử dụng requirement của Case khác.",
    };
  const spec = sampleSpec(c);
  const open = c.discovery.gaps.filter((g) => g.status !== "Resolved");
  const details = {
    incoming: {
      input: c.incomingRequest,
      processing:
        "Ghi nhận yêu cầu gốc, tạo Case ID và giữ context chưa làm rõ tách khỏi request.",
      output: `${c.id} · ${c.name}`,
      action: "BA kiểm tra request gốc và bổ sung bối cảnh trước discovery.",
      next: "Chuyển Context Analysis để làm rõ điều kiện hoàn tiền và phạm vi.",
    },
    context: {
      input: `Incoming Request của ${c.id}; context hiện có gồm ${c.context.items.filter((i) => i.certainty === "Known").length} Known, ${c.context.items.filter((i) => i.certainty === "Unknown").length} Unknown và ${c.context.items.filter((i) => i.certainty === "Assumption").length} Assumption.`,
      processing:
        c.context.hypothesis ||
        "Cần xác định flow hoàn tiền, rule đủ điều kiện, hệ thống thanh toán và unknown outcome.",
      output: `Context Ready: ${contextReady(c) ? "Pass" : "Unknown"}; complexity: ${c.context.complexity.join(" / ")}.`,
      action:
        "BA review/adjust context, hypothesis và căn cứ complexity; giữ follow-up của Unknown/Assumption.",
      next: contextReady(c)
        ? "Đủ cơ sở để BA bắt đầu Discovery."
        : "Bổ sung context/owner/follow-up và review hypothesis; không cần giả định rule.",
    },
    discovery: {
      input:
        "Context đã review; response, evidence và thông tin từ Operations, Policy Owner, Integration Owner.",
      processing: `Đối chiếu Required Information, giữ hai nguồn 14/30 ngày; ${open.length} Gap còn mở.`,
      output: `${c.discovery.evidence.length} evidence; Information Complete: ${discoveryReady(c) ? "Pass" : c.discovery.checkpointRun ? "Unknown / Fail" : "Chưa chạy"}.`,
      action:
        "BA trả lời, review evidence, xác nhận đúng authority và xử lý conflict; chỉ validate pattern khi có căn cứ.",
      next: discoveryReady(c)
        ? "Có thể sang Requirement Formation; quality chưa tự Ready."
        : "Quay lại module có Gap; business decision thiếu evidence không được suy đoán.",
    },
    formation: {
      input: `Discovery và ${qualitySummary(c).total} Requirement active trong shared state.`,
      processing:
        "BA tạo Draft, liên kết nguồn, chỉnh component/AC và chạy checklist deterministic + BA review.",
      output: `${qualitySummary(c).ready}/${qualitySummary(c).total} Quality Ready; ${qualitySummary(c).open} Fail/Unknown; ${qualitySummary(c).stale} Stale checks.`,
      action:
        "Mở finding, sửa đúng Requirement/AC hoặc xác minh nguồn rồi re-validation.",
      next: "Quality Ready không tự Customer Confirmed hoặc Dev Ready; Stage 4 là quy trình riêng.",
    },
    customer: {
      input: "CRD của selected requirements và phiên bản review tương ứng.",
      processing:
        "Preview ghi nhận authority, scope, version và kết quả review riêng với Evidence Confirmed.",
      output:
        "Customer review: Pending. Ví dụ partial confirmation chỉ áp dụng những REQ/AC được xác nhận.",
      action: "BA ghi reviewer và căn cứ review; gửi CRD không tự Confirmed.",
      next: "Chỉ phạm vi Quality Ready + Customer Confirmed hiện hành mới đánh giá Dev Readiness.",
    },
    readiness: {
      input:
        "Requirement/AC, Customer-confirmed baseline và external dependency.",
      processing:
        "Preview kiểm tra khả năng triển khai mà không tự quyết định nghiệp vụ; quality và external blocker được tách riêng.",
      output: `Nhánh mẫu: nếu quality và confirmation đã đạt thì Ready but Blocked do ${spec.blocker}`,
      action:
        "BA theo dõi contract owner. Với Case hiện tại, chưa có Customer Confirmation thật nên không kết luận Ready.",
      next: "Có business gap: Not Ready, quay Discovery/Requirement. Dependency chưa sẵn sàng: giữ blocker; không coi acknowledged là resolved.",
    },
    handoff: {
      input: "Requirement scope, nguồn và đúng snapshot đã review.",
      processing:
        "Preview CRD/DRD chiếu từ cùng canonical sample requirements/rules/AC; giữ dependency ngoài phạm vi.",
      output:
        "CRD draft, DRD draft; Dev Review: Pending. Handoff chưa phát hành.",
      action:
        "BA kiểm tra coverage, scope/version và căn cứ Dev Acceptance; giữ snapshot cũ khi thay đổi.",
      next: "Handoff implementation chỉ cho scope Ready. Accepted with Blocker không phải Implementation Unblocked.",
    },
  };
  return details[stage];
}
export function outputSections(c: WorkCase, audience: "CRD" | "DRD") {
  const spec = sampleSpec(c);
  const req = spec.requirements
    .map((r) => `${r.id} — ${r.title}: ${r.behavior}`)
    .join("\n\n");
  const ac = spec.requirements.map((r) => r.ac).join("\n\n");
  if (audience === "CRD")
    return [
      [
        "Document Overview",
        `CRD-PREVIEW-${c.id}-v${c.version}\n${c.name} · ${c.id} · Draft · working version ${c.version}. Scope: ${spec.requirements.map((r) => r.id).join(", ")}. Business owner: Process Owner (kịch bản). Chưa có snapshot đã gửi review.`,
      ],
      [
        "Business Background & Objectives",
        c.context.items.find((i) => i.id === "need")?.text || "Chưa làm rõ.",
      ],
      [
        "Scope & Boundaries",
        c.context.items.find((i) => i.id === "scope")?.text || "Chưa cung cấp.",
      ],
      [
        "Stakeholders & Responsibilities",
        c.discovery.stakeholders
          .map((s) => `${s.role}: ${s.authority}`)
          .join("\n"),
      ],
      [
        "Proposed Business Solution",
        "Đề xuất kiểm tra điều kiện trước khi gửi yêu cầu thanh toán và theo dõi kết quả có căn cứ.",
      ],
      [
        "Business Workflow / Scenarios",
        "Request → Kiểm tra điều kiện → Đủ điều kiện: gửi thanh toán → Thành công: ghi kết quả; chưa biết kết quả: chờ đối soát. Không đủ điều kiện: không gửi, trả lý do. Recovery còn cần xác minh.",
      ],
      ["Detailed Business Requirements", req],
      ["Business Rules & Supporting Details", `RULE-REF-01 — ${spec.rule}`],
      ["Expected Outcomes & Acceptance Criteria", ac],
      [
        "Customer Confirmation",
        "Pending. Chưa ghi nhận approver, authority, scope hoặc evidence xác nhận tài liệu này.",
      ],
    ];
  return [
    [
      "Document Overview & Baseline",
      `DRD-PREVIEW-${c.id}-v${c.version}\n${c.id} · Draft · working version ${c.version}. Customer baseline chưa xác nhận. Scope: ${spec.requirements.map((r) => r.id).join(", ")}. Chưa có snapshot đã gửi Dev review.`,
    ],
    ["Solution Context & Scope", c.incomingRequest],
    [
      "Requirement & Dependency Map",
      spec.requirements.map((r) => `${r.id} → ${r.dependency}`).join("\n"),
    ],
    ["Functional Requirement Specifications", req],
    ["Business Rules & Validation", `RULE-REF-01 — ${spec.rule}`],
    ["Data Specifications", spec.data],
    [
      "Integration Specifications",
      `Refund processing → Payment system. ${spec.blocker} Chưa có interface/payload contract được xác minh.`,
    ],
    [
      "Alternative & Exception Flows",
      "Unknown payment outcome: không đánh dấu success/failure khi chưa có căn cứ. Recovery và duplicate handling cần xác minh qua INT-Q-13, EXC-Q-08.",
    ],
    ["Acceptance Criteria & Verification", ac],
    [
      "Dev Review & Handoff",
      "Dev Review: Pending; chưa có reviewed snapshot hoặc Dev Acceptance. DEP-PAYMENT-CONTRACT: Open.",
    ],
  ];
}
