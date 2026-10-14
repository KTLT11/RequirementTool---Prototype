import type { WorkCase } from "../types/case";
import type {
  Layer2State,
  Requirement,
  RequirementModule,
  RequirementField,
  Layer2Command,
} from "../types/requirement";
import { questions } from "../data/questions";
import {
  evaluateRequirement,
  checkFingerprint,
  RULE_VERSION,
  qualityRules,
  reviewableChecks,
} from "./validationService";
export const requirementModules: RequirementModule[] = [
  "Process",
  "Business Rule",
  "Integration",
  "Data/Entity",
  "Permission",
  "Exception",
  "NFR",
];
export const fieldLabels: Record<RequirementField, string> = {
  need: "Business Need",
  actor: "Actor / Role",
  trigger: "Trigger / Condition",
  behavior: "Expected Behavior",
  rule: "Business Rule / Condition / Outcome",
  data: "Data / Entity / Validation",
  exception: "Exception / Recovery",
  constraint: "Constraint / Scope",
  dependency: "Dependency / Owner / Reference",
  integration: "Integration / Result / Failure",
  permission: "Role / Action / Resource / Scope",
  target: "NFR Target / Threshold",
  measurement: "Measurement / Verification Method",
};
export const moduleFields: Record<RequirementModule, RequirementField[]> = {
  Process: [
    "need",
    "actor",
    "trigger",
    "behavior",
    "rule",
    "exception",
    "dependency",
  ],
  "Business Rule": ["need", "trigger", "behavior", "rule", "dependency"],
  Integration: [
    "need",
    "actor",
    "trigger",
    "behavior",
    "data",
    "integration",
    "exception",
    "dependency",
  ],
  "Data/Entity": ["need", "data", "behavior", "constraint", "dependency"],
  Permission: [
    "need",
    "actor",
    "permission",
    "trigger",
    "behavior",
    "exception",
    "dependency",
  ],
  Exception: ["need", "trigger", "behavior", "exception", "dependency"],
  NFR: ["need", "constraint", "target", "measurement", "dependency"],
};
export function blankRequirement(
  id: string,
  title: string,
  module: RequirementModule,
): Requirement {
  return {
    id,
    title,
    module,
    statement: "",
    fields: Object.fromEntries(
      Object.keys(fieldLabels).map((k) => [k, ""]),
    ) as Requirement["fields"],
    status: "Draft",
    revision: 1,
    questionIds: [],
    evidenceIds: [],
    relatedIds: [],
    scenarios: [],
    applicabilityBasis: "",
    ac: [],
    reviews: {},
    origin: "BA-entered",
  };
}
export function layer2(c: WorkCase): Layer2State {
  return c.layer2 ?? initialLayer2(c.isDemo);
}
export function initialLayer2(demo: boolean): Layer2State {
  const result: Layer2State = {
    requirements: [],
    drafts: {},
    results: [],
    runs: [],
  };
  if (!demo) return result;
  const titles = [
    "Kiểm tra điều kiện hoàn tiền",
    "Chuyển yêu cầu đủ điều kiện sang hệ thống thanh toán",
    "Theo dõi kết quả xử lý hoàn tiền",
  ];
  const mods: RequirementModule[] = ["Business Rule", "Integration", "Process"];
  const qs = [
    ["RULE-Q-06"],
    ["PROC-Q-09", "INT-Q-07", "INT-Q-13", "EXC-Q-08"],
    ["INT-Q-13", "EXC-Q-08"],
  ];
  result.requirements = titles.map((t, i) => {
    const r = blankRequirement(`REQ-REF-00${i + 1}`, t, mods[i]);
    r.origin = "Demo Scenario";
    r.questionIds = qs[i];
    r.evidenceIds = i === 0 ? ["EVI-14", "EVI-30"] : [];
    r.statement = [
      "Kiểm tra điều kiện của giao dịch trước khi gửi yêu cầu hoàn tiền. Thời hạn chưa có quyết định đã xác minh.",
      "Chuyển yêu cầu đã đủ điều kiện sang hệ thống thanh toán và ghi nhận kết quả có căn cứ.",
      "Cho phép theo dõi kết quả gắn với yêu cầu hoàn tiền; kết quả chưa rõ phải giữ trạng thái chưa xác định.",
    ][i];
    Object.assign(r.fields, {
      need: "Giảm kiểm tra và theo dõi hoàn tiền thủ công.",
      actor: "Operations / hệ thống xử lý hoàn tiền",
      trigger: "Tiếp nhận yêu cầu hoàn tiền",
      behavior: r.statement,
      dependency: i
        ? "Payment Integration Owner · DEP-PAYMENT-CONTRACT chưa xác minh"
        : "Policy Owner · RULE-Q-06",
      rule:
        i === 0
          ? "Thời hạn 14/30 ngày còn mâu thuẫn; không chọn một giá trị làm fact."
          : "",
      integration:
        i === 1
          ? "Payment system · contract và failure behavior còn cần xác minh."
          : "",
      data:
        i === 1
          ? "Request ID, giao dịch và dữ liệu trao đổi: cần xác minh INT-Q-07."
          : "",
      exception: i ? "Unknown outcome và recovery cần xác minh." : "",
    });
    r.scenarios =
      i === 1
        ? [
            { id: "success", title: "Payment trả kết quả thành công" },
            { id: "no-response", title: "Payment không phản hồi" },
            { id: "unknown-outcome", title: "Payment outcome chưa xác định" },
            { id: "duplicate", title: "Nguy cơ gửi hoàn tiền trùng" },
          ]
        : [
            {
              id: i === 0 ? "not-eligible" : "unknown-outcome",
              title:
                i === 0
                  ? "Giao dịch không đủ điều kiện"
                  : "Kết quả thanh toán chưa xác định",
            },
          ];
    r.applicabilityBasis =
      "Phạm vi scenario mẫu theo các câu hỏi refund đã chọn; BA cần review tính đủ và đúng.";
    r.ac = [
      {
        id: `AC-REF-00${i + 1}`,
        title:
          i === 1 ? "Ghi nhận kết quả thành công" : "Kết quả xử lý có căn cứ",
        format: "Condition/Outcome",
        condition:
          i === 1
            ? "Payment trả success"
            : i === 0
              ? "Giao dịch không đủ điều kiện"
              : "Chưa có kết quả xác minh",
        input: "Yêu cầu và giao dịch liên quan",
        outcome:
          i === 1
            ? "Ghi kết quả success và liên kết request"
            : i === 0
              ? "Không gửi lệnh hoàn tiền; hiển thị lý do"
              : "Giữ trạng thái chưa xác định",
        verification: "Đối chiếu trạng thái request và giao dịch",
        scenarioIds: [r.scenarios[0].id],
        evidenceIds: [],
        status: "Draft",
      },
    ];
    return r;
  });
  return result;
}
export function applyLayer2(input: WorkCase, cmd: Layer2Command): WorkCase {
  const c = structuredClone(input);
  c.layer2 = structuredClone(layer2(c));
  const l = c.layer2;
  if (cmd.op === "draft") {
    if (
      !l.requirements.some(
        (r) => r.id === cmd.requirement.id && r.status !== "Archived",
      )
    )
      throw Error("Requirement không còn active.");
    l.drafts[cmd.requirement.id] = structuredClone(cmd.requirement);
    return c;
  }
  if (cmd.op === "discard") {
    delete l.drafts[cmd.id];
    return c;
  }
  let action = "";
  if (cmd.op === "create") {
    if (!cmd.title.trim() || !requirementModules.includes(cmd.module))
      throw Error("Nhập tên và chọn module.");
    const qids = [...new Set(cmd.questionIds ?? [])],
      eids = [...new Set(cmd.evidenceIds ?? [])];
    if (
      qids.some((id) => !questions.some((q) => q.id === id)) ||
      eids.some(
        (id) =>
          !c.discovery.evidence.some(
            (e) => e.id === id && e.status !== "Superseded",
          ),
      )
    )
      throw Error("Nguồn không hợp lệ hoặc đã superseded.");
    const r = blankRequirement(
      `REQ-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      cmd.title.trim(),
      cmd.module,
    );
    r.questionIds = qids;
    r.evidenceIds = eids;
    if (cmd.parentId) r.parentId = cmd.parentId;
    if (qids.length || eids.length) {
      r.origin = "Discovery template";
      r.fields.need = c.context.items.find((i) => i.id === "need")?.text || "";
      const mapping: Record<string, RequirementField> = {
        "CORE-Q-01": "need",
        "CORE-Q-02": "constraint",
        "PROC-Q-01": "trigger",
        "PROC-Q-09": "behavior",
        "RULE-Q-06": "rule",
        "INT-Q-07": "data",
        "INT-Q-13": "integration",
        "EXC-Q-08": "exception",
      };
      for (const id of qids) {
        const field = mapping[id];
        const response = c.discovery.responses.find((a) => a.questionId === id);
        if (field && response?.text.trim()) r.fields[field] = response.text;
      }
      r.statement =
        r.fields.behavior ||
        "Nội dung đề xuất: BA cần xác định expected behavior từ các nguồn đã chọn; chưa xác nhận.";
    }
    l.requirements.push(r);
    action = `Tạo Draft ${r.id} từ ${r.origin}; chưa Reviewed/Confirmed.`;
  }
  if (cmd.op === "save") {
    const previous = l.requirements.find(
      (r) => r.id === cmd.requirement.id && r.status !== "Archived",
    );
    if (!previous) throw Error("Không tìm thấy Requirement active.");
    const r = structuredClone(cmd.requirement);
    if (!r.title.trim() || !requirementModules.includes(r.module))
      throw Error("Tên và module là bắt buộc.");
    if (
      r.relatedIds.includes(r.id) ||
      r.relatedIds.some(
        (id) =>
          !l.requirements.some((x) => x.id === id && x.status !== "Archived"),
      )
    )
      throw Error("Dependency Requirement không hợp lệ.");
    if (
      r.questionIds.some((id) => !questions.some((q) => q.id === id)) ||
      r.evidenceIds.some((id) => !c.discovery.evidence.some((e) => e.id === id))
    )
      throw Error("Link nguồn không hợp lệ.");
    if (
      new Set(r.ac.map((a) => a.id)).size !== r.ac.length ||
      new Set(r.scenarios.map((s) => s.id)).size !== r.scenarios.length
    )
      throw Error("ID AC/scenario không được trùng.");
    if (
      r.ac.some(
        (a) =>
          a.scenarioIds.some((id) => !r.scenarios.some((s) => s.id === id)) ||
          a.evidenceIds.some(
            (id) => !c.discovery.evidence.some((e) => e.id === id),
          ),
      )
    )
      throw Error("AC còn mapping không hợp lệ; phân bổ lại trước khi lưu.");
    r.status = "Draft";
    r.revision = previous.revision + 1;
    r.reviews = previous.reviews;
    l.requirements[l.requirements.indexOf(previous)] = r;
    delete l.drafts[r.id];
    action = `Lưu ${r.id} revision ${r.revision}; cần review nội dung thay đổi.`;
  }
  if (cmd.op === "archive") {
    const r = l.requirements.find((r) => r.id === cmd.id);
    if (!r) throw Error("Không có Requirement.");
    r.status = "Archived";
    r.revision++;
    delete l.drafts[r.id];
    action = `Archive ${r.id}; giữ AC, nguồn và lịch sử.`;
  }
  if (cmd.op === "split") {
    const parent = l.requirements.find(
      (r) => r.id === cmd.id && r.status !== "Archived",
    );
    if (!parent || l.drafts[parent.id])
      throw Error("Lưu hoặc bỏ draft của Requirement gốc trước khi phân tách.");
    if (
      cmd.children.length < 2 ||
      cmd.children.some((x) => !x.title.trim() || !x.statement.trim())
    )
      throw Error("Cần ít nhất hai behavior riêng, tên và statement rõ.");
    const acIds = cmd.children.flatMap((x) => x.acIds);
    if (
      new Set(acIds).size !== acIds.length ||
      parent.ac.some((a) => !acIds.includes(a.id)) ||
      acIds.some((id) => !parent.ac.some((a) => a.id === id))
    )
      throw Error("Phân bổ mỗi AC gốc cho đúng một Requirement con.");
    if (
      parent.evidenceIds.some(
        (id) => !cmd.children.some((x) => x.evidenceIds.includes(id)),
      ) ||
      cmd.children.some((x) =>
        x.evidenceIds.some((id) => !parent.evidenceIds.includes(id)),
      )
    )
      throw Error("Phân bổ tất cả Evidence gốc; không bỏ source link.");
    for (const allocation of cmd.children) {
      const child = structuredClone(parent);
      child.id = `REQ-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      child.parentId = parent.id;
      child.title = allocation.title.trim();
      child.statement = allocation.statement.trim();
      child.fields.behavior = child.statement;
      child.revision = 1;
      child.status = "Draft";
      child.reviews = {};
      child.ac = child.ac.filter((a) => allocation.acIds.includes(a.id));
      child.evidenceIds = allocation.evidenceIds;
      child.scenarios = child.scenarios.filter((s) =>
        child.ac.some((a) => a.scenarioIds.includes(s.id)),
      );
      child.applicabilityBasis =
        "Phạm vi sau phân tách cần BA review. " + child.applicabilityBasis;
      l.requirements.push(child);
    }
    parent.status = "Archived";
    parent.revision++;
    action = `Phân tách ${parent.id} thành ${cmd.children.length} Draft; giữ parent/source, AC và dependency; BA review lại phân bổ.`;
  }
  if (cmd.op === "review") {
    const r = l.requirements.find(
        (r) => r.id === cmd.id && r.status !== "Archived",
      ),
      rule = qualityRules.find((q) => q.id === cmd.checkId);
    if (
      !r ||
      !rule ||
      !reviewableChecks.includes(cmd.checkId) ||
      !cmd.reviewer.trim() ||
      !cmd.basis.trim()
    )
      throw Error("Review cần reviewer, căn cứ và criterion cần judgment.");
    if (l.drafts[r.id]) throw Error("Lưu hoặc bỏ draft trước khi review.");
    r.reviews[cmd.checkId] = {
      status: cmd.status,
      reviewer: cmd.reviewer.trim(),
      basis: cmd.basis.trim(),
      fingerprint: checkFingerprint(c, r, cmd.checkId),
    };
    if (
      ["REQ-QC-01", "REQ-QC-03", "REQ-QC-07"].every(
        (id) =>
          r.reviews[id]?.status === "Pass" &&
          r.reviews[id].fingerprint === checkFingerprint(c, r, id),
      )
    )
      r.status = "Reviewed";
    action = `BA review ${cmd.checkId} của ${r.id}: ${cmd.status}; không Customer Confirmation.`;
  }
  if (cmd.op === "validate") {
    const ids = [...new Set(cmd.ids)];
    if (
      !ids.length ||
      ids.some(
        (id) =>
          !l.requirements.some((r) => r.id === id && r.status !== "Archived"),
      )
    )
      throw Error("Chọn Requirement active để kiểm tra.");
    if (ids.some((id) => l.drafts[id]))
      throw Error(
        "Có draft chưa lưu trong scope; lưu hoặc bỏ draft trước khi validation.",
      );
    const results = ids.flatMap((id) =>
      evaluateRequirement(
        c,
        l.requirements.find((r) => r.id === id)!,
      ),
    );
    l.results = [
      ...l.results.filter((x) => !ids.includes(x.requirementId)),
      ...results,
    ];
    l.runs.push({
      id: `RUN-${crypto.randomUUID().slice(0, 8)}`,
      date: new Date().toISOString(),
      scope: ids,
      inputVersion: c.version,
      ruleVersion: RULE_VERSION,
      status: "Completed",
      results: structuredClone(results),
    });
    action = `Validation ${ids.length} Requirement: ${results.filter((x) => x.status === "Fail").length} Fail, ${results.filter((x) => x.status === "Unknown").length} Unknown.`;
  }
  c.version++;
  c.previews.customer = { status: "Stale", sourceVersion: c.version };
  c.previews.readiness = { status: "Stale", sourceVersion: c.version };
  c.previews.handoff = { status: "Stale", sourceVersion: c.version };
  c.history.push({
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    stage: "formation",
    action,
  });
  return c;
}
export function reconcileLayer2(before: WorkCase, after: WorkCase): WorkCase {
  if (!after.layer2) return after;
  for (const result of after.layer2.results) {
    const r = after.layer2.requirements.find(
      (r) => r.id === result.requirementId,
    );
    if (!r || r.status === "Archived") continue;
    const oldReview = layer2(before).requirements.find((x) => x.id === r.id)
      ?.reviews[result.checkId];
    if (
      result.fingerprint !== checkFingerprint(after, r, result.checkId) ||
      JSON.stringify(oldReview) !== JSON.stringify(r.reviews[result.checkId])
    ) {
      result.freshness = "Stale";
      const reasons: string[] = [];
      const old = layer2(before).requirements.find((x) => x.id === r.id);
      if (
        old &&
        JSON.stringify({ ...old, reviews: undefined, status: undefined }) !==
          JSON.stringify({ ...r, reviews: undefined, status: undefined })
      )
        reasons.push(
          `${r.id}: Requirement / AC / links đã thay đổi (revision ${old.revision} → ${r.revision})`,
        );
      for (const a of r.ac) {
        const previousAC = old?.ac.find((x) => x.id === a.id);
        if (previousAC && previousAC.outcome !== a.outcome)
          reasons.push(
            `${a.id}: outcome “${previousAC.outcome}” → “${a.outcome}”`,
          );
        else if (!previousAC)
          reasons.push(
            `${a.id}: thêm AC “${a.title}” với coverage ${a.scenarioIds.join(", ")}`,
          );
      }
      for (const id of r.questionIds)
        if (
          JSON.stringify(
            before.discovery.responses.find((x) => x.questionId === id),
          ) !==
            JSON.stringify(
              after.discovery.responses.find((x) => x.questionId === id),
            ) ||
          JSON.stringify(
            before.discovery.gaps.find((x) => x.questionId === id),
          ) !==
            JSON.stringify(
              after.discovery.gaps.find((x) => x.questionId === id),
            )
        )
          reasons.push(
            `${id}: response / gap / resolution đã thay đổi. Response “${before.discovery.responses.find((x) => x.questionId === id)?.text || "trống"}” → “${after.discovery.responses.find((x) => x.questionId === id)?.text || "trống"}”`,
          );
      for (const id of r.evidenceIds)
        if (
          JSON.stringify(before.discovery.evidence.find((x) => x.id === id)) !==
          JSON.stringify(after.discovery.evidence.find((x) => x.id === id))
        )
          reasons.push(
            `${id}: Evidence đã thay đổi. “${before.discovery.evidence.find((x) => x.id === id)?.statement || "không có"}” / ${before.discovery.evidence.find((x) => x.id === id)?.status} → “${after.discovery.evidence.find((x) => x.id === id)?.statement || "không có"}” / ${after.discovery.evidence.find((x) => x.id === id)?.status}`,
          );
      if (!reasons.length)
        reasons.push(
          "Căn cứ review, applicability, rule hoặc nguồn liên quan đã thay đổi",
        );
      result.staleReasons = [...new Set([...result.staleReasons, ...reasons])];
    }
  }
  return after;
}
export function requirementQuality(c: WorkCase, id: string) {
  const results = layer2(c).results.filter((x) => x.requirementId === id);
  if (!results.length) return "Not Executed";
  if (results.some((x) => x.freshness === "Stale")) return "Stale";
  if (results.some((x) => x.status === "Fail")) return "Fail";
  if (results.some((x) => x.status === "Unknown")) return "Unknown";
  return "Quality Ready";
}
export function qualitySummary(c: WorkCase) {
  const l = layer2(c),
    active = l.requirements.filter((r) => r.status !== "Archived");
  return {
    total: active.length,
    ready: active.filter((r) => requirementQuality(c, r.id) === "Quality Ready")
      .length,
    open: l.results.filter(
      (x) =>
        active.some((r) => r.id === x.requirementId) &&
        (x.status === "Fail" || x.status === "Unknown"),
    ).length,
    stale: l.results.filter(
      (x) =>
        active.some((r) => r.id === x.requirementId) && x.freshness === "Stale",
    ).length,
  };
}
