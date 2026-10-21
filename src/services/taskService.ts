import { ux } from "./uxService";
import type { WorkCase, Stage } from "../types/case";
import {
  contextReady,
  discoveryReady,
  discoveryChecks,
} from "./discoveryService";
import { layer2, requirementQuality } from "./requirementService";
import { devReadiness } from "./documentService";
import { questions } from "../data/questions";
import { casePath } from "../app/navigation";
export type TaskType =
  | "incoming"
  | "source"
  | "context"
  | "advance"
  | "question"
  | "pattern"
  | "evidence"
  | "gap"
  | "checkpoint"
  | "formation"
  | "edit"
  | "validate"
  | "finding"
  | "customer"
  | "changes"
  | "readiness"
  | "documents"
  | "dev";
export interface GuidedTask {
  id: string;
  caseId: string;
  stage: Stage;
  type: TaskType;
  target: string;
  goal: string;
  purpose: string;
  inputs: { title: string; value: string; entityId?: string }[];
  preconditions: string[];
  blockers: string[];
  action: string;
  completion: string;
  complete: boolean;
  available: boolean;
  related: { kind: string; id: string }[];
  rank: number;
  route?: string;
  scope: string[];
  next: string[];
}
export function taskPath(caseId: string, task: string, parent?: string) {
  const p = new URLSearchParams({ task });
  if (parent) p.set("parent", parent);
  return `${casePath(caseId, "continue")}?${p}`;
}
export function safeReturn(caseId: string, value: string | null) {
  return value?.startsWith(`/cases/${encodeURIComponent(caseId)}/`) &&
    !value.includes("://")
    ? value
    : null;
}
export function deriveTasks(c: WorkCase) {
  const tasks: GuidedTask[] = [];
  const reqs = layer2(c).requirements.filter((r) => r.status !== "Archived"),
    ctx = contextReady(c),
    disc = discoveryReady(c);
  const add = (
    type: TaskType,
    target: string,
    stage: Stage,
    goal: string,
    purpose: string,
    action: string,
    complete: boolean,
    available: boolean,
    rank: number,
    rest: Partial<GuidedTask> = {},
  ) =>
    tasks.push({
      id: `${c.id}:${type}:${target}`,
      caseId: c.id,
      type,
      target,
      stage,
      goal,
      purpose,
      action,
      complete,
      available,
      rank,
      inputs: [],
      preconditions: [],
      blockers: [],
      completion:
        "Điều kiện nghiệp vụ hiện tại đáp ứng; navigation không thay checkpoint.",
      related: [],
      scope: [],
      next: [],
      ...rest,
    });
  add(
    "incoming",
    "request",
    "incoming",
    "Kiểm tra yêu cầu ban đầu",
    "Giữ nhu cầu và nguồn gốc trước khi khai thác thông tin.",
    "Chỉnh yêu cầu",
    !!c.incomingRequest.trim(),
    true,
    0,
    {
      inputs: [{ title: "Yêu cầu gốc", value: c.incomingRequest }],
      route: casePath(c.id, "sources"),
    },
  );
  add(
    "context",
    "assessment",
    "context",
    "Review bối cảnh và hướng Discovery",
    "Phân biệt thông tin đã biết với giả định trước khi hỏi stakeholder.",
    "Review bối cảnh",
    ctx,
    true,
    10,
    {
      inputs: c.context.items.map((i) => ({
        title: i.label,
        value: `${i.certainty}: ${i.text || "Chưa có thông tin"}`,
        entityId: i.id,
      })),
      blockers: c.context.items
        .filter(
          (i) =>
            !i.text.trim() ||
            (i.certainty !== "Known" && (!i.owner || !i.nextAction.trim())),
        )
        .map((i) => `${i.label}: cần nội dung, owner và follow-up`),
      completion:
        "contextReady: hướng Discovery Accepted, BA reviewed, các item đủ thông tin/follow-up.",
      route: casePath(c.id, "context"),
    },
  );
  add(
    "advance",
    "discovery",
    "discovery",
    "Bắt đầu Discovery",
    "Context đã đủ điều kiện để khai thác thông tin có nguồn.",
    "Bắt đầu Discovery",
    ctx && c.currentStage !== "incoming" && c.currentStage !== "context",
    ctx,
    20,
    {
      route: casePath(c.id, "discovery"),
      preconditions: ctx ? [] : ["Context chưa Ready"],
      completion:
        "Existing advance command chấp nhận; không dùng page visited làm completion.",
    },
  );
  add("source","intake","incoming","Bổ sung tài liệu khách hàng","Tiếp nhận tài liệu khi cần; đây là capability hỗ trợ, không checkpoint bắt buộc.","Mở Request & Sources",false,true,16,{inputs:[{title:"Tài liệu hiện có",value:`${ux(c).documents.length} records; format chưa hỗ trợ chỉ metadata.`}],route:casePath(c.id,"sources"),completion:"Không ép import tài liệu để vượt business gate."});
  for (const item of ux(c).extracted) {
    const document=ux(c).documents.find(d=>d.id===item.documentId);
    add("source",item.id,"incoming",`Review thông tin từ ${document?.name || "tài liệu"}`,"Chấp nhận interpretation không đồng nghĩa Evidence Confirmed; giữ excerpt và provenance.","Review interpretation / liên kết Discovery",item.status!=="Pending Review",true,15,{inputs:[{title:"Source excerpt",value:item.excerpt},{title:"Interpretation",value:item.interpretation},{title:"BA review",value:item.status}],related:[{kind:"extracted",id:item.id}],route:`${casePath(c.id,"sources")}?extracted=${item.id}`,completion:"BA Accept/Reject interpretation; evidence confirmation có điều kiện riêng."});
  }
  for (const [qi, q] of questions.entries()) {
    const r = c.discovery.responses.find((r) => r.questionId === q.id),
      g = c.discovery.gaps.find((g) => g.questionId === q.id);
    add(
      "question",
      q.id,
      "discovery",
      q.question,
      q.why,
      "Lưu response",
      !!r?.text.trim(),
      true,
      30 + qi / 100,
      {
        inputs: [
          { title: "Required Information", value: q.infoId },
          { title: "Response", value: r?.text || "Chưa có response" },
        ],
        related: [{ kind: "question", id: q.id }],
        completion:
          "Response canonical được lưu, evidence vẫn cần review/xác minh.",
        route: `${casePath(c.id, "discovery")}?question=${q.id}`,
      },
    );
    if (g)
      add(
        "gap",
        g.id,
        "discovery",
        g.type === "Conflict"
          ? "Xác minh nguồn thông tin mâu thuẫn"
          : `Làm rõ: ${q.question}`,
        "Chỉ quyết định nghiệp vụ khi có nguồn và thẩm quyền phù hợp.",
        "Ghi clarification / resolution",
        g.status === "Resolved",
        true,
        g.type === "Conflict" ? 27 : 36,
        {
          inputs: g.evidenceIds.flatMap((id) => {
            const e = c.discovery.evidence.find((e) => e.id === id);
            return e
              ? [
                  {
                    title:
                      c.discovery.stakeholders.find((s) => s.id === e.sourceId)
                        ?.name || "Nguồn chưa xác định",
                    value: `${e.statement} · ${e.review} / ${e.status}`,
                    entityId: e.id,
                  },
                ]
              : [];
          }),
          blockers: g.status === "Resolved" ? [] : [g.description],
          related: [{ kind: "gap", id: g.id }],
          completion: "Gap Resolved từ evidence/authority/basis hợp lệ.",
          route: `${casePath(c.id, "evidence")}?view=${g.type === "Conflict" ? "conflicts" : "gaps"}&gap=${g.id}`,
        },
      );
  }
  for (const e of c.discovery.evidence.filter((e) => e.status !== "Superseded"))
    add(
      "evidence",
      e.id,
      "discovery",
      e.review === "Pending Review"
        ? "Review nguồn thông tin"
        : "Xác minh nguồn và authority",
      "BA review không đồng nghĩa Evidence Confirmed.",
      "Review / xác minh evidence",
      e.review === "Reviewed" && e.status === "Confirmed",
      true,
      34,
      {
        inputs: [
          {
            title:
              c.discovery.stakeholders.find((s) => s.id === e.sourceId)?.name ||
              "Nguồn",
            value: e.statement,
          },
          { title: "Mức xác minh", value: `${e.review} / ${e.status}` },
        ],
        related: [{ kind: "evidence", id: e.id }],
        completion: "Reviewed + Confirmed có đúng authority/basis.",
        route: `${casePath(c.id, "evidence")}?evidence=${e.id}`,
      },
    );
  for (const p of c.discovery.patterns)
    add(
      "pattern",
      p.module,
      "discovery",
      `Review module ${p.module}`,
      "BA xác định applicability từ evidence, không tự suy module đã Validated.",
      "Ghi review module",
      p.status === "Validated",
      ctx,
      38,
      {
        inputs: [{ title: "Pattern", value: p.status }],
        preconditions: ctx ? [] : ["Context chưa Ready"],
        route: `${casePath(c.id, "discovery")}?view=patterns`,
      },
    );
  add(
    "checkpoint",
    "discovery",
    "discovery",
    "Kiểm tra Information Complete",
    "Đảm bảo không phải suy đoán quyết định nghiệp vụ khi Formation.",
    "Chạy checkpoint",
    disc,
    ctx,
    39,
    {
      route: `${casePath(c.id, "discovery")}?view=checkpoint`,
      inputs: discoveryChecks(c).map((x) => ({
        title: x.id,
        value: `${x.status}: ${x.reason}`,
      })),
      preconditions: ctx ? [] : ["Context chưa Ready"],
      completion: "discoveryReady theo các check áp dụng.",
    },
  );
  if (c.context.items.some((i) => i.certainty === "Assumption"))
    add(
      "context",
      "assumptions",
      "discovery",
      "Xác minh giả định trước Requirement Formation",
      "Giả định chưa được xác minh đang chặn Information Complete; không dùng như fact.",
      "Làm rõ giả định",
      false,
      ctx,
      38.5,
      {
        inputs: c.context.items
          .filter((i) => i.certainty === "Assumption")
          .map((i) => ({ title: i.label, value: i.text })),
        blockers: [
          "Đối chiếu nguồn và stakeholder trước khi đổi certainty; chỉnh context cần BA review lại.",
        ],
        route: casePath(c.id, "context"),
      },
    );
  add(
    "advance",
    "formation",
    "formation",
    "Bắt đầu Requirement Formation",
    "Thông tin Discovery đã đạt checkpoint.",
    "Bắt đầu Formation",
    disc &&
      ["formation", "customer", "readiness", "handoff"].includes(
        c.currentStage,
      ),
    disc,
    40,
    {
      route: casePath(c.id, "requirements"),
      preconditions: disc ? [] : ["Information Complete chưa đạt"],
    },
  );
  add(
    "formation",
    "create",
    "formation",
    "Tạo Requirement từ thông tin đã khai thác",
    "Tạo Draft có nguồn, không tự biến thông tin chưa xác minh thành quyết định.",
    "Tạo Requirement Draft",
    reqs.length > 0,
    true,
    42,
    {
      inputs: [
        {
          title: "Phạm vi hiện có",
          value: `${reqs.length} Requirements; BA review coverage vẫn cần thiết.`,
        },
      ],
      route: casePath(c.id, "requirements"),
    },
  );
  for (const r of reqs) {
    const draft = !!layer2(c).drafts[r.id],
      quality = requirementQuality(c, r.id);
    add(
      "edit",
      r.id,
      "formation",
      `Hoàn thiện: ${r.title}`,
      "Chỉnh component/AC và lưu trước khi kiểm tra.",
      "Mở editor đúng Requirement",
      !draft && !!r.statement.trim() && r.ac.length > 0,
      true,
      draft ? 41 : 43,
      {
        scope: [r.id],
        inputs: [
          { title: "Nội dung đã lưu", value: r.statement },
          {
            title: "Draft",
            value: draft ? "Có thay đổi chưa lưu" : "Không có draft chưa lưu",
          },
        ],
        related: [{ kind: "requirement", id: r.id }],
        route: `${casePath(c.id, "requirements")}?requirement=${r.id}&tab=content`,
      },
    );
    add(
      "validate",
      r.id,
      "formation",
      `Kiểm tra chất lượng: ${r.title}`,
      "Kết quả phải dựa trên nội dung đã lưu và nguồn hiện hành.",
      "Chạy validation",
      !["Stale", "Not Executed"].includes(quality),
      !draft,
      draft ? 41 : 44,
      {
        scope: [r.id],
        inputs: [{ title: "Quality", value: quality }],
        preconditions: draft
          ? ["Có Draft chưa lưu; lưu hoặc bỏ draft trước."]
          : [],
        related: [{ kind: "requirement", id: r.id }],
        route: `${casePath(c.id, "requirements")}?requirement=${r.id}`,
      },
    );
  }
  for (const result of layer2(c).results.filter((x) =>
    reqs.some((r) => r.id === x.requirementId),
  )) {
    const r = reqs.find((r) => r.id === result.requirementId)!;
    add(
      "finding",
      result.id,
      "formation",
      `Xử lý ${result.checkId}: ${r.title}`,
      "Sửa đúng đối tượng rồi re-validation; không Resolve bằng đổi badge.",
      "Mở phần cần xử lý",
      result.status === "Pass" || result.status === "N/A",
      true,
      result.freshness === "Stale" ? 44 : result.status === "Fail" ? 45 : 46,
      {
        complete:
          result.freshness === "Current" &&
          (result.status === "Pass" || result.status === "N/A"),
        scope: [r.id],
        inputs: [
          {
            title: "Đánh giá",
            value: `${result.status} / ${result.freshness}`,
          },
          { title: "Lý do", value: result.explanation },
        ],
        blockers: result.freshness === "Stale" ? result.staleReasons : [],
        related: [{ kind: "finding", id: result.id }],
        route: `${casePath(c.id, "quality")}?requirement=${r.id}&finding=${result.id}`,
        completion:
          "Current Pass/N/A của criterion; Quality Ready vẫn cần toàn scope.",
      },
    );
  }
  const confirmed =
    c.confirmation &&
    (c.confirmation.outcome === "Confirmed" ||
      c.confirmation.outcome === "Partially Confirmed");
  for (const r of reqs) {
    const ready = requirementQuality(c, r.id) === "Quality Ready",
      covered = !!confirmed && c.confirmation.scopeReqIds.includes(r.id),
      reviewCurrent = c.previews.customer.status !== "Stale",
      scope = [r.id];
    add(
      "customer",
      r.id,
      "customer",
      `Review với Customer: ${r.title}`,
      "Ghi nhận phạm vi và căn cứ; Quality không thay Customer Confirmation.",
      "Mở Customer review",
      covered && reviewCurrent,
      ready,
      50,
      {
        scope,
        preconditions: ready
          ? []
          : [
              `Quality ${requirementQuality(c, r.id)}; chưa đủ điều kiện đề xuất confirmation.`,
            ],
        route: `${casePath(c.id, "customer")}?scope=${r.id}`,
        inputs: [
          {
            title: "Customer record",
            value: `${c.confirmation?.outcome || "Pending"} · preview ${c.previews.customer.status}. Record không tự chứng minh hiệu lực baseline.`,
          },
        ],
      },
    );
    const rd = devReadiness(c, scope);
    add(
      "readiness",
      r.id,
      "readiness",
      `Đánh giá readiness: ${r.title}`,
      "Giữ Quality, Customer scope và blocker riêng biệt.",
      "Xem kết quả readiness",
      rd.status === "Ready",
      ready && covered && reviewCurrent,
      60,
      {
        scope,
        inputs: [{ title: "Readiness hiện có", value: rd.status }],
        blockers: rd.reasons,
        preconditions:
          ready && covered && reviewCurrent
            ? []
            : ["Scope cần Quality Ready và Customer Confirmation"],
        route: `${casePath(c.id, "handoff")}?stage=readiness&scope=${r.id}`,
      },
    );
    add(
      "documents",
      r.id,
      "handoff",
      `Chuẩn bị tài liệu: ${r.title}`,
      "CRD/DRD cùng canonical scope; snapshot không là approval.",
      "Mở tài liệu và snapshots",
      c.snapshots.some(
        (s) => s.audience === "DRD" && s.scopeReqIds.includes(r.id),
      ),
      ready,
      65,
      {
        scope,
        preconditions: ready
          ? []
          : ["Scope chưa Quality Ready; chỉ có thể xem Draft."],
        route: `${casePath(c.id, "handoff")}?stage=handoff&scope=${r.id}`,
      },
    );
    add(
      "dev",
      r.id,
      "handoff",
      `Dev review: ${r.title}`,
      "Ghi review của Dev; Accepted with Blocker không là Implementation Unblocked.",
      "Mở Dev review",
      c.devReview?.outcome === "Accepted" &&
        c.devReview.scopeReqIds.includes(r.id),
      covered && rd.status === "Ready",
      70,
      {
        scope,
        preconditions:
          covered && rd.status === "Ready"
            ? []
            : ["Readiness hoặc Customer scope chưa đủ."],
        route: `${casePath(c.id, "handoff")}?stage=handoff&scope=${r.id}`,
      },
    );
  }
  if (c.confirmation?.outcome === "Changes Requested")
    add(
      "changes",
      "customer",
      "customer",
      "Làm rõ yêu cầu thay đổi của Customer",
      "Giữ record/snapshot cũ; chỉnh source hoặc Requirement và review lại scope.",
      "Mở scope cần thay đổi",
      false,
      true,
      41,
      {
        scope: c.confirmation.scopeReqIds,
        inputs: [
          {
            title: "Yêu cầu thay đổi",
            value:
              c.confirmation.changeRequests ||
              c.confirmation.comments ||
              "Chưa ghi chi tiết; cần hỏi lại reviewer.",
          },
        ],
        route: casePath(c.id, "customer"),
      },
    );
  if (
    c.devReview?.outcome === "Changes Requested" ||
    c.devReview?.outcome === "Accepted with Blocker"
  )
    add(
      "changes",
      "dev",
      "handoff",
      "Xử lý phản hồi hoặc blocker của Dev",
      "Không kết luận implementation unblocked từ Accepted with Blocker.",
      "Mở Dev review và references",
      false,
      true,
      41,
      {
        scope: c.devReview.scopeReqIds,
        inputs: [
          {
            title: "Căn cứ / blocker",
            value: c.devReview.blockers || c.devReview.basis,
          },
        ],
        route: `${casePath(c.id, "handoff")}?stage=handoff`,
      },
    );
  const frontier = !c.incomingRequest.trim()
    ? "incoming"
    : !ctx
      ? "context"
      : !disc
        ? "discovery"
        : reqs.some((r) => requirementQuality(c, r.id) !== "Quality Ready")
          ? "formation"
          : "customer";
  const candidate = tasks.filter((t) => !t.complete && t.available && t.type !== "source");
  const recommended =
    candidate
      .filter((t) => t.stage === frontier)
      .sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id))[0] ||
    candidate.sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id))[0];
  for (const t of tasks)
    t.next = tasks
      .filter((x) => x.available && !x.complete && x.id !== t.id)
      .sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id))
      .slice(0, 4)
      .map((x) => x.id);
  return { tasks, recommended, frontier };
}
export function selectTask(c: WorkCase, intent?: string | null) {
  const state = deriveTasks(c);
  return {
    ...state,
    selected: state.tasks.find((t) => t.id === intent) || state.recommended,
    missing: !!intent && !state.tasks.some((t) => t.id === intent),
  };
}
