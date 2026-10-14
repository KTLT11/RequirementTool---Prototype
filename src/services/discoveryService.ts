import type {
  WorkCase,
  Gap,
  CheckStatus,
  Evidence,
  Resolution,
} from "../types/case";
import { questions } from "../data/questions";
export function authorized(c: WorkCase, e: Evidence, authorityId: string) {
  const q = questions.find((q) => q.id === e.questionId);
  return (
    !!q &&
    authorityId === e.sourceId &&
    !!c.discovery.stakeholders.find(
      (s) => s.id === authorityId && s.modules.includes(q.module),
    )
  );
}
export function hasConflict(c: WorkCase, questionId: string) {
  if (questionId !== "RULE-Q-06") return false;
  const values = c.discovery.evidence
    .filter((e) => e.questionId === questionId && e.status !== "Superseded")
    .map((e) => e.statement.match(/(\d+)\s*ngày/)?.[1])
    .filter(Boolean);
  return new Set(values).size > 1;
}
export function validResolution(c: WorkCase, r: Resolution | null) {
  if (!r) return false;
  const e = c.discovery.evidence.find((e) => e.id === r.evidenceId);
  return (
    !!e &&
    e.status === "Confirmed" &&
    e.review === "Reviewed" &&
    authorized(c, e, r.authorityId) &&
    !!r.basis.trim() &&
    r.sourceVersions.every((ref) =>
      c.discovery.evidence.some(
        (e) => `${e.id}@${e.version}` === ref && e.status !== "Superseded",
      ),
    )
  );
}
export function reconcileGaps(c: WorkCase): Gap[] {
  return questions.map((q) => {
    const previous = c.discovery.gaps.find((g) => g.questionId === q.id);
    const response = c.discovery.responses.find((r) => r.questionId === q.id);
    const evidence = c.discovery.evidence.find(
      (e) => e.id === response?.evidenceId,
    );
    const conflict = hasConflict(c, q.id);
    const conflictValues = [
      ...new Set(
        c.discovery.evidence
          .filter((e) => e.questionId === q.id && e.status !== "Superseded")
          .map((e) => e.statement.match(/(\d+)\s*ngày/)?.[1])
          .filter(Boolean),
      ),
    ];
    const satisfied =
      !!response?.text.trim() &&
      !!evidence &&
      evidence.status === "Confirmed" &&
      evidence.review === "Reviewed" &&
      authorized(c, evidence, evidence.authorityId) &&
      (!conflict || validResolution(c, previous?.resolution ?? null));
    const type = conflict
      ? "Conflict"
      : !response?.text.trim()
        ? "Missing"
        : "Unknown";
    const resolution = satisfied
      ? (previous?.resolution ?? {
          authorityId: evidence!.authorityId,
          evidenceId: evidence!.id,
          basis: evidence!.basis,
          sourceVersions: [`${evidence!.id}@${evidence!.version}`],
        })
      : null;
    return {
      id: `GAP-${q.id}`,
      questionId: q.id,
      infoId: q.infoId,
      module: q.module,
      checkId: q.checkId,
      type,
      description: satisfied
        ? `Đã xác minh: ${q.question}`
        : conflict
          ? `Các nguồn đưa ra thời hạn ${conflictValues.join(" / ")} ngày; cần quyết định của Policy Owner.`
          : type === "Missing"
            ? `Chưa có thông tin: ${q.question}`
            : `Thông tin chưa có evidence xác nhận: ${q.question}`,
      evidenceIds: c.discovery.evidence
        .filter((e) => e.questionId === q.id && e.status !== "Superseded")
        .map((e) => e.id),
      status: satisfied
        ? "Resolved"
        : previous?.clarifications.length
          ? "In Clarification"
          : "Open",
      clarifications: previous?.clarifications ?? [],
      resolution,
    } as Gap;
  });
}
export function discoveryChecks(
  c: WorkCase,
): { id: string; status: CheckStatus; reason: string }[] {
  const open = c.discovery.gaps.filter((g) => g.status !== "Resolved");
  const questionStatus = (module: string): CheckStatus =>
    open.some((g) => g.module === module) ? "Unknown" : "Pass";
  const patterns = c.discovery.patterns.every((p) => p.status === "Validated");
  return [
    {
      id: "DISC-CHK-01",
      status: questionStatus("Core"),
      reason:
        "Business need/current state/outcome: đối chiếu response và evidence Core.",
    },
    {
      id: "DISC-CHK-02",
      status: questionStatus("Core"),
      reason: "Actor và scope cần nguồn có thẩm quyền.",
    },
    {
      id: "DISC-CHK-03",
      status: open.some((g) => g.type === "Conflict") ? "Fail" : "Pass",
      reason:
        "Conflict/dependency đã được ghi nhận; conflict quan trọng phải xử lý.",
    },
    {
      id: "DISC-CHK-04",
      status: patterns ? "Pass" : "Unknown",
      reason: "BA validate pattern theo thông tin thực tế.",
    },
    {
      id: "DISC-CHK-05",
      status: patterns ? "Pass" : "Unknown",
      reason:
        "Process chính; Business Rule, Integration, Exception hỗ trợ trong phạm vi Case.",
    },
    {
      id: "DISC-CHK-06",
      status: open.length ? "Unknown" : "Pass",
      reason:
        "Completeness của tập thông tin áp dụng trong phạm vi discovery mẫu.",
    },
    {
      id: "DISC-CHK-07",
      status: open.some((g) => g.type === "Conflict")
        ? "Fail"
        : open.length
          ? "Unknown"
          : "Pass",
      reason:
        "Không còn conflict hoặc information gap quan trọng giữa các module.",
    },
    {
      id: "DISC-CHK-08",
      status:
        open.length || c.context.items.some((i) => i.certainty === "Assumption")
          ? "Unknown"
          : "Pass",
      reason:
        "Unknown/Assumption ảnh hưởng behavior cần được làm rõ; giả định hỗ trợ tra kết quả theo request ID chưa được dùng như fact.",
    },
    {
      id: "DISC-CHK-09",
      status: contextReady(c) ? "Pass" : "Unknown",
      reason:
        "Context/complexity cần BA review và reassess sau material change.",
    },
    {
      id: "DISC-CHK-10",
      status: patterns ? "Pass" : "Unknown",
      reason: "Pattern/module set đã được BA kiểm tra lại.",
    },
    {
      id: "DISC-CHK-11",
      status: open.length ? "Unknown" : "Pass",
      reason:
        "Business decisions trong phạm vi mẫu phải có Confirmed Evidence.",
    },
  ];
}
export function discoveryProgress(c: WorkCase) {
  const total = questions.length;
  const resolved = c.discovery.gaps.filter(
    (g) => g.status === "Resolved",
  ).length;
  return { total, resolved, percent: Math.round((resolved / total) * 100) };
}
export function contextReady(c: WorkCase) {
  return (
    c.context.reviewed &&
    !c.context.reassessmentRequired &&
    c.context.suggestionStatus === "Accepted" &&
    c.context.items.every(
      (i) =>
        !!i.text.trim() &&
        (i.certainty === "Known" || (!!i.owner && !!i.nextAction.trim())),
    )
  );
}
export function discoveryReady(c: WorkCase) {
  return (
    c.discovery.checkpointRun &&
    discoveryChecks(c).every((x) => x.status === "Pass" || x.status === "N/A")
  );
}
export function mode(c: WorkCase) {
  return c.context.complexity.includes("High")
    ? "Extended Discovery"
    : c.context.complexity.every((x) => x === "Low")
      ? "Focused Discovery"
      : "Standard Discovery";
}
