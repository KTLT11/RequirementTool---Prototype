import type { WorkCase, DocumentSection, Evidence } from "../types/case";
import type { Requirement } from "../types/requirement";
import { layer2, requirementQuality, qualitySummary } from "./requirementService";
// QG-06 B3.1 (TCR-09): aggregate confidence across every Evidence linked to a
// Requirement, plus any open Gap affecting it, into one of the six business-
// language states. A single Confirmed Evidence never promotes the whole
// Requirement to Confirmed when a Conflict is still open or other linked
// Evidence disagrees — Conflicting/Insufficient takes precedence so BA and
// Customer never see a false confirmation.
function requirementConfidenceLabel(c: WorkCase, r: Requirement): string {
  const evidence = r.evidenceIds
    .map((id) => c.discovery.evidence.find((e) => e.id === id))
    .filter((e): e is Evidence => !!e);
  const relatedGaps = c.discovery.gaps.filter(
    (g) => g.status !== "Resolved" && r.questionIds.includes(g.questionId),
  );
  const openConflict = relatedGaps.some((g) => g.type === "Conflict");
  if (openConflict)
    return "Thông tin đang mâu thuẫn giữa các nguồn — cần BA xử lý trước khi xem là current fact";
  if (!evidence.length) {
    const openMissing = relatedGaps.some(
      (g) => g.type === "Missing" || g.type === "Unknown",
    );
    return openMissing
      ? "Thiếu thông tin — chưa có nguồn xác nhận, đang chờ làm rõ"
      : "Thiếu thông tin — chưa có nguồn xác nhận";
  }
  const current = evidence.filter((e) => e.status !== "Superseded");
  if (!current.length)
    return "Đã thay thế — không dùng làm current fact";
  if (current.some((e) => e.status === "Confirmed"))
    return "Đã xác nhận theo nguồn có thẩm quyền";
  if (current.some((e) => e.review === "Reviewed"))
    return "Đã BA review — đang chờ xác nhận chính thức";
  return "Phương án đề xuất — cần xác nhận";
}
function activeRequirements(c: WorkCase) {
  return layer2(c).requirements.filter((r) => r.status !== "Archived");
}
function inScope(scopeReqIds: string[], c: WorkCase) {
  const all = activeRequirements(c);
  return all.filter((r) => scopeReqIds.includes(r.id));
}
// QG-06 E2.1 (TCR-10): dependencies outside the selected scope are referenced
// by ID/version only — never expanded into full content, never silently dropped.
function externalDependencyRefs(c: WorkCase, scope: Requirement[], scopeReqIds: string[]) {
  const all = activeRequirements(c);
  const refs = new Set<string>();
  for (const r of scope) {
    if (r.parentId && !scopeReqIds.includes(r.parentId)) refs.add(r.parentId);
    for (const id of r.relatedIds) if (!scopeReqIds.includes(id)) refs.add(id);
  }
  return [...refs]
    .map((id) => all.find((r) => r.id === id))
    .filter((r): r is Requirement => !!r)
    .map((r) => `${r.id}@rev${r.revision} — Referenced only (ngoài scope tài liệu)`);
}
function confirmationStatusLabel(c: WorkCase) {
  const { outcome } = c.confirmation;
  if (outcome === "Pending") return "Pending — chưa gửi review";
  if (outcome === "Confirmed") return "Confirmed";
  if (outcome === "Partially Confirmed") return "Partially Confirmed";
  return "Changes Requested";
}
function reqBlock(c: WorkCase, r: Requirement, scopeReqIds: string[]): string {
  const dependency = r.fields.dependency?.trim();
  const scenarios = r.scenarios.length
    ? r.scenarios.map((s) => `  - ${s.title} (${s.id})`).join("\n")
    : "  - Không có nhánh phụ được ghi nhận.";
  const acRefs = r.ac.length
    ? r.ac.map((a) => a.id).join(", ")
    : "Chưa có AC.";
  const relatedOutOfScope = r.relatedIds.filter((id) => !scopeReqIds.includes(id));
  return [
    `${r.id} — ${r.title}`,
    `Source Confidence: ${requirementConfidenceLabel(c, r)}`,
    `Business Purpose: ${r.fields.need || "Chưa làm rõ."}`,
    `Expected Behavior: ${r.statement || "Chưa xác định."}`,
    r.fields.actor?.trim() ? `Actor: ${r.fields.actor}` : "",
    r.fields.trigger?.trim() ? `Trigger/Condition: ${r.fields.trigger}` : "",
    `Scenarios:\n${scenarios}`,
    `AC References: ${acRefs}`,
    dependency ? `Dependency: ${dependency}` : "",
    relatedOutOfScope.length
      ? `Related (outside scope): ${relatedOutOfScope.join(", ")} — Referenced only`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
export function buildCrdSections(c: WorkCase, scopeReqIds: string[]): DocumentSection[] {
  const scope = inScope(scopeReqIds, c);
  const allActive = activeRequirements(c);
  const byId = (id: string) => c.context.items.find((i) => i.id === id);
  const extDeps = externalDependencyRefs(c, scope, scopeReqIds);
  const processWithScenarios = scope.filter(
    (r) => r.module === "Process" && r.scenarios.length > 1,
  );
  const sharedRules = scope.filter(
    (r) => r.module === "Business Rule" || r.fields.rule?.trim(),
  );
  const sections: DocumentSection[] = [
    {
      code: "C01",
      title: "Document Overview",
      applies: true,
      body: [
        `Case: ${c.name} (${c.id})`,
        `Document Scope: ${scopeReqIds.length ? scopeReqIds.join(", ") : "Chưa chọn Requirement."}`,
        `Review Status: ${confirmationStatusLabel(c)}`,
        `Working version: v${c.version}`,
      ].join("\n"),
    },
    {
      code: "C02",
      title: "Business Background & Objectives",
      applies: true,
      body: [
        `Current Context: ${byId("current")?.text || "Chưa làm rõ."}`,
        `Business Need: ${byId("need")?.text || "Chưa làm rõ."}`,
        `Desired Outcome: ${byId("target")?.text || "Chưa làm rõ."}`,
      ].join("\n"),
    },
    {
      code: "C03",
      title: "Scope & Boundaries",
      applies: true,
      body: [
        `In Scope: ${byId("scope")?.text || "Chưa cung cấp."}`,
        `Constraints: ${byId("constraints")?.text || "Không có."}`,
        `External Dependencies: ${byId("dependencies")?.text || "Không có."}`,
        extDeps.length
          ? `Dependency ngoài scope tài liệu:\n${extDeps.map((d) => `  - ${d}`).join("\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    },
    {
      code: "C04",
      title: "Stakeholders & Responsibilities",
      applies: true,
      body:
        c.discovery.stakeholders
          .map((s) => `${s.role} (${s.name}): ${s.authority}`)
          .join("\n") || "Chưa có stakeholder được ghi nhận.",
    },
    {
      code: "C05",
      title: "Proposed Business Solution",
      applies: true,
      body:
        scope
          .map((r) => `${r.id} — ${r.title}: ${r.fields.need || r.statement}`)
          .join("\n") || "Chưa có Requirement trong scope.",
    },
    {
      code: "C06",
      title: "Business Workflow / Scenarios",
      applies: processWithScenarios.length > 0,
      body: processWithScenarios
        .map(
          (r) =>
            `${r.id} — ${r.title}:\n` +
            r.scenarios.map((s) => `  - ${s.title} (${s.id})`).join("\n"),
        )
        .join("\n\n"),
    },
    {
      code: "C07",
      title: "Detailed Business Requirements",
      applies: true,
      body:
        scope.map((r) => reqBlock(c, r, scopeReqIds)).join("\n\n") ||
        "Chưa có Requirement trong scope.",
    },
    {
      code: "C08",
      title: "Business Rules & Supporting Details",
      applies: sharedRules.length > 0,
      body: sharedRules
        .map((r) => `${r.id}: ${r.fields.rule || "Chưa xác định rule."}`)
        .join("\n"),
    },
    {
      code: "C09",
      title: "Expected Outcomes & Acceptance Criteria",
      applies: true,
      body:
        scope
          .flatMap((r) =>
            r.ac.map(
              (a) =>
                `${a.id} (${r.id}): ${a.condition} → ${a.outcome}` +
                (a.verification ? ` · Verification: ${a.verification}` : ""),
            ),
          )
          .join("\n") || "Chưa có AC trong scope.",
    },
    {
      code: "C10",
      title: "Customer Confirmation",
      applies: true,
      body: [
        `Confirmation Scope: ${c.confirmation.scopeReqIds.join(", ") || "Chưa ghi nhận."}`,
        `Outcome: ${confirmationStatusLabel(c)}`,
        c.confirmation.approverRole
          ? `Approver: ${c.confirmation.approverRole} (${c.confirmation.approverIdentity})`
          : "Approver: Chưa ghi nhận.",
        c.confirmation.date ? `Date: ${c.confirmation.date}` : "Date: Chưa có.",
        c.confirmation.comments ? `Comments: ${c.confirmation.comments}` : "",
        c.confirmation.changeRequests
          ? `Change Requests: ${c.confirmation.changeRequests}`
          : "",
        allActive.length !== c.confirmation.scopeReqIds.length &&
        c.confirmation.outcome !== "Pending"
          ? "Lưu ý: còn Requirement active ngoài phạm vi đã xác nhận."
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];
  return sections;
}
export function buildDrdSections(c: WorkCase, scopeReqIds: string[]): DocumentSection[] {
  const scope = inScope(scopeReqIds, c);
  const extDeps = externalDependencyRefs(c, scope, scopeReqIds);
  const integrations = scope.filter(
    (r) => r.module === "Integration" || r.fields.integration?.trim(),
  );
  const dataReqs = scope.filter(
    (r) => r.module === "Data/Entity" || r.fields.data?.trim(),
  );
  const permissionReqs = scope.filter(
    (r) => r.module === "Permission" || r.fields.permission?.trim(),
  );
  const exceptionReqs = scope.filter(
    (r) => r.module === "Exception" || r.fields.exception?.trim(),
  );
  const nfrReqs = scope.filter((r) => r.module === "NFR");
  const sharedRules = scope.filter(
    (r) => r.module === "Business Rule" || r.fields.rule?.trim(),
  );
  return [
    {
      code: "D01",
      title: "Document Overview & Baseline",
      applies: true,
      body: [
        `Case: ${c.id} · ${c.name}`,
        `Scope: ${scopeReqIds.join(", ") || "Chưa chọn."}`,
        `Customer Confirmed Baseline: ${confirmationStatusLabel(c)}`,
        `Working version: v${c.version}`,
      ].join("\n"),
    },
    {
      code: "D02",
      title: "Solution Context & Scope",
      applies: true,
      body: [
        `Purpose: ${c.context.items.find((i) => i.id === "need")?.text || "Chưa làm rõ."}`,
        `In/Out Scope: ${c.context.items.find((i) => i.id === "scope")?.text || "Chưa cung cấp."}`,
        extDeps.length
          ? `External dependencies:\n${extDeps.map((d) => `  - ${d}`).join("\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    },
    {
      code: "D03",
      title: "Requirement & Dependency Map",
      applies: true,
      body:
        scope
          .map(
            (r) =>
              `${r.id} — ${r.title} · ${r.module} · Quality: ${requirementQuality(c, r.id)} · rev${r.revision}` +
              (r.relatedIds.length ? ` · relates: ${r.relatedIds.join(", ")}` : ""),
          )
          .join("\n") +
        (extDeps.length ? `\n\nExternal (Referenced only):\n${extDeps.join("\n")}` : ""),
    },
    {
      code: "D04",
      title: "Functional Requirement Specifications",
      applies: scope.length > 0,
      body: scope.map((r) => reqBlock(c, r, scopeReqIds)).join("\n\n"),
    },
    {
      code: "D05",
      title: "Business Rules & Validation",
      applies: sharedRules.length > 0,
      body: sharedRules
        .map((r) => `${r.id}: ${r.fields.rule || "Chưa xác định rule."}`)
        .join("\n"),
    },
    {
      code: "D06",
      title: "Data Specifications",
      applies: dataReqs.length > 0,
      body: dataReqs
        .map((r) => `${r.id}: ${r.fields.data || "Chưa xác định data."}`)
        .join("\n"),
    },
    {
      code: "D07",
      title: "Roles & Permissions",
      applies: permissionReqs.length > 0,
      body: permissionReqs
        .map((r) => `${r.id}: ${r.fields.permission || "Chưa xác định permission."}`)
        .join("\n"),
    },
    {
      code: "D08",
      title: "Integration Specifications",
      applies: integrations.length > 0,
      body: integrations
        .map((r) => `${r.id}: ${r.fields.integration || "Chưa xác định."}`)
        .join("\n"),
    },
    {
      code: "D09",
      title: "Alternative & Exception Flows",
      applies: exceptionReqs.length > 0,
      body: exceptionReqs
        .map((r) => `${r.id}: ${r.fields.exception || "Chưa xác định exception."}`)
        .join("\n"),
    },
    {
      code: "D10",
      title: "Non-functional Requirements",
      applies: nfrReqs.length > 0,
      body: nfrReqs
        .map(
          (r) =>
            `${r.id}: target ${r.fields.target || "chưa xác định"} · measurement ${r.fields.measurement || "chưa xác định"}`,
        )
        .join("\n"),
    },
    {
      code: "D11",
      title: "Acceptance Criteria & Verification",
      applies: true,
      body:
        scope
          .flatMap((r) =>
            r.ac.map(
              (a) =>
                `${a.id} (${r.id}): ${a.condition} → ${a.outcome} · Verification: ${a.verification || "chưa xác định"}`,
            ),
          )
          .join("\n") || "Chưa có AC trong scope.",
    },
    {
      code: "D12",
      title: "Dev Review & Handoff",
      applies: true,
      body: [
        `Review Scope: ${c.devReview.scopeReqIds.join(", ") || "Chưa ghi nhận."}`,
        `Outcome: ${c.devReview.outcome}`,
        c.devReview.reviewer ? `Reviewer: ${c.devReview.reviewer}` : "Reviewer: Chưa có.",
        c.devReview.date ? `Date: ${c.devReview.date}` : "Date: Chưa có.",
        c.devReview.blockers ? `Blockers: ${c.devReview.blockers}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];
}
export type ReadinessStatus = "Ready" | "Ready but Blocked" | "Not Ready";
export function devReadiness(
  c: WorkCase,
  scopeReqIds: string[],
): { status: ReadinessStatus; reasons: string[] } {
  const reasons: string[] = [];
  if (!scopeReqIds.length) return { status: "Not Ready", reasons: ["Chưa chọn scope."] };
  const scope = inScope(scopeReqIds, c);
  const notReady = scope.filter((r) => requirementQuality(c, r.id) !== "Quality Ready");
  for (const r of notReady)
    reasons.push(`${r.id}: Quality ${requirementQuality(c, r.id)}`);
  const confirmed =
    (c.confirmation.outcome === "Confirmed" ||
      c.confirmation.outcome === "Partially Confirmed") &&
    scopeReqIds.every((id) => c.confirmation.scopeReqIds.includes(id));
  if (!confirmed)
    reasons.push("Customer Confirmation chưa bao phủ scope này.");
  if (notReady.length || !confirmed) return { status: "Not Ready", reasons };
  const openGaps = c.discovery.gaps.filter(
    (g) =>
      g.status !== "Resolved" &&
      scope.some((r) => r.questionIds.includes(g.questionId)),
  );
  for (const g of openGaps) reasons.push(`${g.id}: ${g.description}`);
  const externalBlockers = scope.flatMap((r) =>
    r.relatedIds
      .filter((id) => !scopeReqIds.includes(id))
      .filter((id) => requirementQuality(c, id) !== "Quality Ready")
      .map((id) => `${r.id} phụ thuộc ${id} (ngoài scope, chưa Quality Ready)`),
  );
  reasons.push(...externalBlockers);
  if (openGaps.length || externalBlockers.length)
    return { status: "Ready but Blocked", reasons };
  return { status: "Ready", reasons: [] };
}
export function defaultDocumentScope(c: WorkCase) {
  return activeRequirements(c).map((r) => r.id);
}
export function documentSummary(c: WorkCase) {
  return qualitySummary(c);
}
