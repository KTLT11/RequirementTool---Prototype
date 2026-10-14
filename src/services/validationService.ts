import type { WorkCase, CheckStatus } from "../types/case";
import type { Requirement, CheckResult } from "../types/requirement";
import { authorized } from "./discoveryService";
import { ux } from "./uxService";
export const RULE_VERSION = "layer2-prototype-1.0";
export const qualityRules = [
  [
    "REQ-QC-01",
    "Requirement đúng Business Need và scope",
    "BA review",
    "Structural",
  ],
  [
    "REQ-QC-02",
    "Thông tin nghiệp vụ quan trọng đủ, không suy đoán",
    "Structured",
    "Framework",
  ],
  [
    "REQ-QC-03",
    "Nội dung rõ ràng, không ambiguous hoặc tự mâu thuẫn",
    "BA review",
    "Framework",
  ],
  [
    "REQ-QC-04",
    "Nhất quán với rule, Discovery và Requirement liên quan",
    "Structured",
    "Traceability/Consistency",
  ],
  [
    "REQ-QC-05",
    "Dependency và quan hệ đã được thể hiện",
    "BA review",
    "Framework",
  ],
  ["REQ-QC-06", "Có cơ sở kiểm chứng Requirement", "Structured", "Structural"],
  [
    "REQ-QC-07",
    "Cấu trúc phù hợp, behavior có thể kiểm chứng độc lập",
    "BA review",
    "Framework",
  ],
  [
    "REQ-QC-08",
    "Business decisions có Confirmed Evidence và nguồn",
    "Structured",
    "Traceability/Consistency",
  ],
  [
    "AC-CHK-01",
    "AC phản ánh đúng behavior và expected outcome",
    "BA review",
    "Framework",
  ],
  [
    "AC-CHK-02",
    "Condition, input và expected outcome rõ khi áp dụng",
    "Structured",
    "Structural",
  ],
  [
    "AC-CHK-03",
    "Bao phủ rule, permission, exception và edge case quan trọng",
    "Structured",
    "Framework",
  ],
  [
    "AC-CHK-04",
    "Kết quả kiểm chứng được, không chủ quan",
    "BA review",
    "Framework",
  ],
  [
    "AC-CHK-05",
    "AC nhất quán với Requirement và nội dung liên quan",
    "Structured",
    "Traceability/Consistency",
  ],
  [
    "STRUCT-ACTOR",
    "Actor bắt buộc theo loại Requirement",
    "Structured",
    "Structural",
  ],
].map(([id, criterion, method, layer]) => ({
  id,
  criterion,
  method: method as CheckResult["method"],
  layer,
  version: RULE_VERSION,
  applicableModules: "Theo module/applicability của Requirement",
  requiredInputs: id.startsWith("AC-")
    ? "Requirement, AC, scenario, evidence"
    : "Requirement, Discovery, evidence, review",
  evaluationLogic: id,
}));
const judgment = [
  "REQ-QC-01",
  "REQ-QC-03",
  "REQ-QC-05",
  "REQ-QC-07",
  "AC-CHK-01",
  "AC-CHK-04",
];
// Explicit per-check input contracts. No Case-wide version in fingerprints:
// an unrelated source edit must not invalidate an independent evaluation.
export function checkInput(c: WorkCase, r: Requirement, id: string): unknown {
  const qids = [
    ...new Set([
      ...r.questionIds,
      ...c.discovery.evidence
        .filter(
          (e) =>
            r.evidenceIds.includes(e.id) ||
            r.ac.some((a) => a.evidenceIds.includes(e.id)),
        )
        .map((e) => e.questionId),
    ]),
  ].sort();
  const evidence = c.discovery.evidence
    .filter(
      (e) =>
        r.evidenceIds.includes(e.id) ||
        r.ac.some((a) => a.evidenceIds.includes(e.id)) ||
        qids.includes(e.questionId),
    )
    .map((e) => ({ ...e }));
  const source = {
    questions: qids,
    responses: c.discovery.responses.filter((x) => qids.includes(x.questionId)),
    evidence,
    gaps: c.discovery.gaps.filter((x) => qids.includes(x.questionId)),
    extracted: ux(c).extracted.filter((x) =>
      evidence.some((e) => e.extractedId === x.id),
    ),
    stakeholders: c.discovery.stakeholders.filter((s) =>
      evidence.some((e) => e.authorityId === s.id),
    ),
  };
  const content = {
    title: r.title,
    module: r.module,
    statement: r.statement,
    fields: r.fields,
    scenarios: r.scenarios,
    applicabilityBasis: r.applicabilityBasis,
    coverageApplicability: r.coverageApplicability ?? "Applicable",
    questionIds: r.questionIds,
    evidenceIds: r.evidenceIds,
    relatedIds: r.relatedIds,
  };
  if (id === "STRUCT-ACTOR") return { module: r.module, actor: r.fields.actor };
  if (id === "AC-CHK-02")
    return {
      module: r.module,
      ac: r.ac.map((a) => ({
        id: a.id,
        condition: a.condition,
        input: a.input,
        outcome: a.outcome,
      })),
    };
  if (id === "AC-CHK-03")
    return {
      scenarios: r.scenarios,
      basis: r.applicabilityBasis,
      applicability: r.coverageApplicability ?? "Applicable",
      ac: r.ac.map((a) => ({
        id: a.id,
        scenarioIds: a.scenarioIds,
        condition: a.condition,
        outcome: a.outcome,
        verification: a.verification,
      })),
      source,
    };
  if (id === "REQ-QC-08")
    return {
      questionIds: r.questionIds,
      evidenceIds: r.evidenceIds,
      acEvidence: [...new Set(r.ac.flatMap((a) => a.evidenceIds))].sort(),
      source,
    };
  if (id === "REQ-QC-04" || id === "AC-CHK-05")
    return {
      content,
      ac: id === "AC-CHK-05" ? r.ac : undefined,
      source,
      related: c.layer2?.requirements
        .filter((x) => r.relatedIds.includes(x.id))
        .map((x) => ({ ...x, reviews: undefined })),
    };
  if (id === "REQ-QC-02") return { content, source };
  if (id === "REQ-QC-06")
    return {
      behavior: r.fields.behavior,
      ac: r.ac,
      review: r.reviews["AC-CHK-04"],
    };
  return {
    content,
    ac: id.startsWith("AC-") ? r.ac : undefined,
    source,
    need:
      id === "REQ-QC-01"
        ? c.context.items.filter((i) => ["need", "scope"].includes(i.id))
        : undefined,
  };
}
export function checkFingerprint(c: WorkCase, r: Requirement, id: string) {
  const text = JSON.stringify({
    rule: RULE_VERSION,
    input: checkInput(c, r, id),
  });
  let a = 2166136261,
    b = 5381;
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 16777619);
    b = Math.imul(b, 33) ^ text.charCodeAt(i);
  }
  return `${RULE_VERSION}:${text.length}:${(a >>> 0).toString(16)}:${(b >>> 0).toString(16)}`;
}
function reviewResult(
  c: WorkCase,
  r: Requirement,
  id: string,
): [CheckStatus, string] {
  const v = r.reviews[id];
  return v && v.fingerprint === checkFingerprint(c, r, id)
    ? [v.status, `BA ${v.reviewer}: ${v.basis}`]
    : [
        "Unknown",
        "Cần BA review judgment trên nội dung và nguồn hiện tại; có text không chứng minh tiêu chí đã đạt.",
      ];
}
export function evaluateRequirement(
  c: WorkCase,
  r: Requirement,
): CheckResult[] {
  const linkedIds = [
    ...new Set([...r.evidenceIds, ...r.ac.flatMap((a) => a.evidenceIds)]),
  ];
  const qids = [
    ...new Set([
      ...r.questionIds,
      ...c.discovery.evidence
        .filter((e) => linkedIds.includes(e.id))
        .map((e) => e.questionId),
    ]),
  ];
  const gaps = c.discovery.gaps.filter(
    (g) => qids.includes(g.questionId) && g.status !== "Resolved",
  );
  const conflict = gaps.some((g) => g.type === "Conflict");
  const sources = linkedIds.map((id) =>
    c.discovery.evidence.find((e) => e.id === id),
  );
  const verified = (e: (typeof sources)[number]) =>
    !!e &&
    e.status === "Confirmed" &&
    e.review === "Reviewed" &&
    !!e.basis.trim() &&
    authorized(c, e, e.authorityId);
  const missingQuestionEvidence = qids.filter(
    (id) => !sources.some((e) => e?.questionId === id && verified(e)),
  );
  const certainty: [CheckStatus, string] = conflict
    ? ["Fail", "Nguồn trong scope còn conflict chưa có resolution hợp lệ."]
    : gaps.length
      ? [
          "Unknown",
          `Còn ${gaps.length} Gap trong scope nguồn; quay Discovery để xác minh.`,
        ]
      : sources.length === 0 ||
          sources.some((e) => !verified(e)) ||
          missingQuestionEvidence.length
        ? [
            "Unknown",
            "Nguồn thiếu, unconfirmed, assumption hoặc superseded; chưa đủ căn cứ để kết luận nghiệp vụ.",
          ]
        : [
            "Pass",
            "Tất cả sources trong scope được Reviewed + Confirmed, có authority/basis; không còn Gap áp dụng.",
          ];
  const activeRelated = c.layer2?.requirements ?? [];
  const aligned = conflict
    ? (["Fail", "Conflict hiện hành ảnh hưởng nội dung liên quan."] as [
        CheckStatus,
        string,
      ])
    : r.relatedIds.some(
          (id) =>
            !activeRelated.some((x) => x.id === id && x.status !== "Archived"),
        )
      ? (["Fail", "Dependency Requirement đã archive hoặc không tồn tại."] as [
          CheckStatus,
          string,
        ])
      : certainty[0] !== "Pass"
        ? certainty
        : ([
            "Unknown",
            "Không có conflict được ghi nhận; BA vẫn cần review tính nhất quán ngữ nghĩa.",
          ] as [CheckStatus, string]);
  const fieldsRequired: Record<string, string[]> = {
    Process: ["need", "trigger", "behavior"],
    "Business Rule": ["need", "rule", "behavior"],
    Integration: ["need", "integration", "data", "behavior", "exception"],
    "Data/Entity": ["need", "data"],
    Permission: ["need", "permission", "behavior"],
    Exception: ["need", "trigger", "exception", "behavior"],
    NFR: ["need", "target", "measurement", "constraint"],
  };
  return [...qualityRules]
    .sort(
      (a, b) =>
        ["Structural", "Framework", "Traceability/Consistency"].indexOf(
          a.layer,
        ) -
        ["Structural", "Framework", "Traceability/Consistency"].indexOf(
          b.layer,
        ),
    )
    .map((rule) => {
      let value: [CheckStatus, string] = ["Unknown", "Chưa đủ dữ liệu."];
      if (judgment.includes(rule.id)) value = reviewResult(c, r, rule.id);
      if (rule.id === "REQ-QC-02") {
        const missing = (fieldsRequired[r.module] ?? []).filter(
          (k) => !r.fields[k as keyof Requirement["fields"]].trim(),
        );
        value = missing.length
          ? [
              "Fail",
              `Thiếu component áp dụng: ${missing.join(", ")}. Presence chỉ là structural check; business sufficiency vẫn cần evidence.`,
            ]
          : certainty;
      }
      if (rule.id === "REQ-QC-08") value = certainty;
      if (rule.id === "REQ-QC-04" || rule.id === "AC-CHK-05") {
        value = aligned;
        // Semantic alignment needs explicit judgment, even after source checks pass.
        const v = r.reviews[rule.id];
        if (
          aligned[0] === "Unknown" &&
          certainty[0] === "Pass" &&
          v &&
          v.fingerprint === checkFingerprint(c, r, rule.id)
        )
          value = [v.status, `BA ${v.reviewer}: ${v.basis}`];
      }
      if (rule.id === "REQ-QC-06")
        value = !r.ac.length
          ? ["Fail", "Requirement chưa có AC / Acceptance Conditions."]
          : !r.fields.behavior.trim() && r.module !== "NFR"
            ? ["Fail", "Thiếu expected behavior để liên kết AC."]
            : r.ac.some((a) => !a.outcome.trim() || !a.verification.trim())
              ? ["Fail", "AC thiếu outcome hoặc phương pháp kiểm chứng."]
              : reviewResult(c, r, "AC-CHK-04");
      if (rule.id === "AC-CHK-01" || rule.id === "AC-CHK-04")
        if (!r.ac.length) value = ["Fail", "Chưa có AC để đánh giá."];
      if (rule.id === "AC-CHK-02")
        value = !r.ac.length
          ? ["Fail", "Chưa có AC."]
          : r.ac.some(
                (a) =>
                  !a.condition.trim() ||
                  !a.outcome.trim() ||
                  (r.module !== "NFR" && !a.input.trim()),
              )
            ? [
                "Fail",
                "AC thiếu condition, input hoặc expected outcome áp dụng.",
              ]
            : [
                "Unknown",
                "Các field cấu trúc đủ; cần BA xác minh tính rõ ràng của condition/input/outcome.",
              ];
      if (rule.id === "AC-CHK-03") {
        const missing = r.scenarios.filter(
          (s) =>
            !r.ac.some(
              (a) =>
                a.scenarioIds.includes(s.id) &&
                a.condition.trim() &&
                a.outcome.trim() &&
                a.verification.trim(),
            ),
        );
        value = missing.length
          ? [
              "Fail",
              `Thiếu AC có cấu trúc cho: ${missing.map((s) => s.title).join("; ")}.`,
            ]
          : !r.scenarios.length
            ? [
                "Unknown",
                "BA chưa xác định applicability của rule/exception/edge case.",
              ]
            : !r.applicabilityBasis.trim()
              ? ["Unknown", "Thiếu căn cứ xác định scenario áp dụng."]
              : [
                  "Unknown",
                  "Coverage của các scenario đã chọn đủ; BA cần review applicability và completeness của phạm vi này.",
                ];
        if (r.coverageApplicability === "Unknown")
          value = ["Unknown", "Applicability chưa được BA xác định."];
        if (r.coverageApplicability === "N/A") {
          const mandatory = qids.some((id) =>
            ["INT-Q-13", "EXC-Q-08", "RULE-Q-06"].includes(id),
          );
          const v = r.reviews[rule.id];
          value =
            mandatory || r.scenarios.length
              ? [
                  "Fail",
                  "Scope chứa rule/exception/edge case áp dụng; không thể loại bằng N/A.",
                ]
              : r.applicabilityBasis.trim() &&
                  v?.status === "Pass" &&
                  v.fingerprint === checkFingerprint(c, r, rule.id)
                ? [
                    "N/A",
                    `BA ${v.reviewer} xác định không áp dụng: ${r.applicabilityBasis}. ${v.basis}`,
                  ]
                : [
                    "Unknown",
                    "N/A cần applicability rationale và BA review hiện hành.",
                  ];
        }
      }
      if (rule.id === "STRUCT-ACTOR")
        value = ["NFR", "Data/Entity", "Business Rule", "Exception"].includes(
          r.module,
        )
          ? [
              "N/A",
              "Actor không bắt buộc cho cấu trúc module này; BA xác định applicability.",
            ]
          : r.fields.actor.trim()
            ? [
                "Pass",
                "Actor field hiện diện; identity/scope đúng cần BA review.",
              ]
            : [
                "Fail",
                "Actor bắt buộc cho Process/Integration/Permission nhưng còn trống.",
              ];
      // Structured successes cannot stand in for semantic judgment. These reviews
      // only upgrade Unknown after the mechanical blockers above have cleared.
      if (
        ["AC-CHK-02", "AC-CHK-03"].includes(rule.id) &&
        value[0] === "Unknown" &&
        r.ac.length &&
        (rule.id !== "AC-CHK-03" ||
          (r.coverageApplicability !== "Unknown" &&
            r.scenarios.length &&
            r.applicabilityBasis.trim()))
      ) {
        const v = r.reviews[rule.id];
        if (v && v.fingerprint === checkFingerprint(c, r, rule.id))
          value = [
            v.status,
            `BA ${v.reviewer}: ${v.basis}; structured blockers đã được kiểm tra.`,
          ];
      }
      const entityIds = rule.id.startsWith("AC-")
        ? [...r.ac.map((a) => a.id), ...qids]
        : [...r.evidenceIds, ...qids];
      return {
        id: `FIND-${r.id}-${rule.id}`,
        requirementId: r.id,
        checkId: rule.id,
        status: value[0],
        freshness: "Current",
        staleReasons: [],
        fingerprint: checkFingerprint(c, r, rule.id),
        ruleVersion: RULE_VERSION,
        inputVersion: c.version,
        explanation: value[1],
        action: ["REQ-QC-02", "REQ-QC-04", "REQ-QC-08", "AC-CHK-05"].includes(
          rule.id,
        )
          ? "Xem nguồn / Gap; xác minh với stakeholder đúng authority rồi chạy lại."
          : rule.id.startsWith("AC-") || rule.id === "REQ-QC-06"
            ? "Mở AC, bổ sung condition/outcome/coverage và review trước khi chạy lại."
            : "Chỉnh component hoặc ghi BA review có căn cứ rồi chạy lại.",
        method: rule.method,
        severity: value[0] === "Fail" ? "High" : "Medium",
        entityIds,
      } as CheckResult;
    });
}
// Hybrid criteria remain mechanical first, then require BA judgment.
export const reviewableChecks = [
  ...judgment,
  "REQ-QC-04",
  "AC-CHK-02",
  "AC-CHK-03",
  "AC-CHK-05",
];
