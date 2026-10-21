import type { WorkCase, Stage } from "../types/case";
import type { GuidedTask } from "./taskService";
import { questions } from "../data/questions";
import { stageOrder, stageLabels } from "../data/cases";
import { layer2 } from "./requirementService";
import { ux } from "./uxService";
import { taskPath, safeReturn } from "./taskService";

export function taskEntity(c: WorkCase, t: GuidedTask): string {
  const req = layer2(c).requirements.find(
    (r) => r.id === t.target || t.scope.includes(r.id),
  );
  const evidence = c.discovery.evidence.find((e) => e.id === t.target);
  const gap = c.discovery.gaps.find((g) => g.id === t.target);
  const question = questions.find(
    (q) =>
      q.id === t.target ||
      q.id === gap?.questionId ||
      q.id === evidence?.questionId,
  );
  const extracted = ux(c).extracted.find((x) => x.id === t.target);
  const document = ux(c).documents.find((d) => d.id === extracted?.documentId);
  if (req)
    return `Requirement: ${req.title} · ${req.id}${t.type === "finding" ? ` · ${t.target}` : ""}`;
  const source =
    evidence &&
    c.discovery.stakeholders.find((s) => s.id === evidence.sourceId);
  if (evidence && question)
    return `Câu hỏi: ${question.question} · Nguồn: ${source?.name || evidence.sourceId} · ${evidence.id}`;
  if (question)
    return `Câu hỏi: ${question.question} · ${question.id}${t.target !== question.id ? ` · ${t.target}` : ""}`;
  if (document)
    return `Tài liệu: ${document.name} · ${extracted!.value} · ${t.target}`;
  if (t.type === "pattern") return `Module: ${t.target}`;
  if (t.type === "context")
    return t.target === "assumptions"
      ? "Context · Giả định cần xác minh"
      : "Context · Bối cảnh và hướng Discovery";
  return `Case ${c.id} · ${t.target}`;
}

export function alternativeTasks(
  tasks: GuidedTask[],
  current: GuidedTask,
  recommended: GuidedTask | undefined,
  frontier: string,
): GuidedTask[] {
  const currentEntities = new Set([
    current.target,
    ...current.scope,
    ...current.related.map((x) => x.id),
  ]);
  const relevance = (t: GuidedTask) =>
    [t.target, ...t.scope, ...t.related.map((x) => x.id)].some((id) =>
      currentEntities.has(id),
    )
      ? 0
      : t.stage === current.stage
        ? 1
        : 2;
  return tasks
    .filter(
      (t) =>
        !t.complete &&
        t.available &&
        t.id !== current.id &&
        t.id !== recommended?.id &&
        stageOrder.indexOf(t.stage) <= stageOrder.indexOf(frontier as Stage),
    )
    .sort(
      (a, b) =>
        relevance(a) - relevance(b) ||
        a.rank - b.rank ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 4);
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
export type TaskStatusFilter = "available" | "blocked" | "all";
export function browseTasks(
  c: WorkCase,
  tasks: GuidedTask[],
  query: string,
  stage: Stage | "all",
  status: TaskStatusFilter,
) {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  return tasks
    .filter(
      (t) =>
        (stage === "all" || t.stage === stage) &&
        (status === "all" ||
          (!t.complete &&
            (status === "available" ? t.available : !t.available))) &&
        words.every((word) =>
          normalize(
            `${t.goal} ${stageLabels[t.stage]} ${taskEntity(c, t)} ${t.preconditions.join(" ")} ${t.blockers.join(" ")}`,
          ).includes(word),
        ),
    )
    .sort(
      (a, b) =>
        stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage) ||
        a.rank - b.rank ||
        a.id.localeCompare(b.id),
    );
}

export function taskSelectionPath(
  caseId: string,
  taskId: string,
  params: URLSearchParams,
) {
  const next = new URLSearchParams(params);
  next.set("task", taskId);
  if (next.get("parent") === taskId) {
    const origin = safeReturn(caseId, next.get("origin"));
    if (
      origin &&
      new URLSearchParams(origin.split("?")[1]).get("task") === taskId
    )
      return origin;
    next.delete("parent");
    next.delete("origin");
  }
  return `${taskPath(caseId, taskId).split("?")[0]}?${next}`;
}

/** Open the task's working surface, retaining the guided task to return to. */
export function taskWorkspacePath(
  caseId: string,
  task: GuidedTask,
  params: URLSearchParams,
) {
  const route = safeReturn(caseId, task.route ?? null);
  if (!route) return taskSelectionPath(caseId, task.id, params);
  const destination = new URL(route, "https://requirement-tool.local");
  destination.searchParams.set(
    "returnTo",
    taskSelectionPath(caseId, params.get("task") || task.id, params),
  );
  return `${destination.pathname}${destination.search}${destination.hash}`;
}
