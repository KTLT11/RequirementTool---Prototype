import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { TaskNavigator } from "../components/domain/TaskNavigator";
import { createDemoBaseline } from "../data/cases";
import { initialLayer2 } from "./requirementService";
import { deriveTasks } from "./taskService";
import {
  alternativeTasks,
  browseTasks,
  taskEntity,
  taskSelectionPath,
  taskWorkspacePath,
} from "./taskNavigator";
const base = () => {
  const c = createDemoBaseline();
  c.layer2 = initialLayer2(true);
  return c;
};
test("Shortlist is bounded, actionable, incomplete and excludes future/current/recommended", () => {
  const c = base(),
    s = deriveTasks(c),
    current = s.recommended!;
  const copies = Array.from({ length: 12 }, (_, i) => ({
    ...current,
    id: `copy-${i}`,
    target: `target-${i}`,
    rank: i,
  }));
  const future = {
    ...current,
    id: "future",
    stage: "handoff" as const,
    available: true,
  };
  const blocked = { ...current, id: "blocked", available: false },
    completed = { ...current, id: "done", complete: true };
  const short = alternativeTasks(
    [...s.tasks, ...copies, future, blocked, completed],
    current,
    s.recommended,
    s.frontier,
  );
  assert.equal(short.length, 4);
  assert(
    short.every(
      (t) =>
        t.available &&
        !t.complete &&
        t.stage !== "handoff" &&
        t.id !== current.id,
    ),
  );
  assert.deepEqual(
    short,
    alternativeTasks(
      [...s.tasks, ...copies, future, blocked, completed],
      current,
      s.recommended,
      s.frontier,
    ),
  );
});
test("Related entity comes before unrelated tasks without deduplicating equal labels", () => {
  const c = base(),
    current = deriveTasks(c).recommended!;
  const a = { ...current, id: "one", goal: "Same title", rank: 100 },
    b = { ...a, id: "two" },
    unrelated = { ...a, id: "other", target: "unrelated", rank: 0 };
  assert.deepEqual(
    alternativeTasks([unrelated, b, a], current, undefined, "context").map(
      (t) => t.id,
    ),
    ["one", "two", "other"],
  );
});
test("Browser all retains every task including complete and blocked without mutating state", () => {
  const c = base(),
    s = deriveTasks(c),
    before = JSON.stringify(c);
  assert.deepEqual(
    browseTasks(c, s.tasks, "", "all", "all")
      .map((t) => t.id)
      .sort(),
    s.tasks.map((t) => t.id).sort(),
  );
  assert.equal(JSON.stringify(c), before);
  assert(
    browseTasks(c, s.tasks, "", "all", "blocked").every(
      (t) => !t.available && !t.complete,
    ),
  );
  assert(
    browseTasks(c, s.tasks, "", "all", "available").every(
      (t) => t.available && !t.complete,
    ),
  );
});
test("Search combines stage/status with Vietnamese text and entity IDs; empty results are valid", () => {
  const c = base(),
    s = deriveTasks(c);
  const question = s.tasks.find((t) => t.type === "question" && !t.complete)!;
  assert(
    browseTasks(c, s.tasks, question.target, "discovery", "available").some(
      (t) => t.id === question.id,
    ),
  );
  assert(browseTasks(c, s.tasks, "boi canh", "context", "available").length);
  assert.deepEqual(browseTasks(c, s.tasks, "not-an-entity", "all", "all"), []);
  assert(browseTasks(c, s.tasks, "", "handoff", "blocked").length);
});
test("Same labels expose different question/requirement contexts and remain selectable", () => {
  const c = base(),
    s = deriveTasks(c);
  const questions = s.tasks
    .filter((t) => t.type === "question")
    .slice(0, 2)
    .map((t) => ({ ...t, goal: "Trùng tên" }));
  assert.notEqual(taskEntity(c, questions[0]), taskEntity(c, questions[1]));
  assert.equal(browseTasks(c, questions, "trung ten", "all", "all").length, 2);
  const reqs = s.tasks.filter((t) => t.type === "edit").slice(0, 2);
  assert.notEqual(taskEntity(c, reqs[0]), taskEntity(c, reqs[1]));
});
test("Choosing a task preserves parent/origin exactly and never mutates input parameters", () => {
  const p = new URLSearchParams({
    task: "old",
    parent: "parent-task",
    origin: "/cases/CASE-DEMO-001/continue?task=root&parent=grandparent",
  });
  const before = p.toString(),
    url = taskSelectionPath("CASE-DEMO-001", "new-task", p),
    actual = new URLSearchParams(url.split("?")[1]);
  assert.equal(actual.get("task"), "new-task");
  assert.equal(actual.get("parent"), p.get("parent"));
  assert.equal(actual.get("origin"), p.get("origin"));
  assert.equal(p.toString(), before);
  const parentUrl = new URLSearchParams(
    taskSelectionPath("CASE-DEMO-001", "parent-task", p).split("?")[1],
  );
  assert(!parentUrl.has("parent"));
  assert(!parentUrl.has("origin"));
});

test("Selecting parent restores its original ancestor context, rejects external origin", () => {
  const origin =
    "/cases/CASE-DEMO-001/continue?task=parent&parent=grandparent&origin=grandparent-return";
  const p = new URLSearchParams({ task: "child", parent: "parent", origin });
  assert.equal(taskSelectionPath("CASE-DEMO-001", "parent", p), origin);
  p.set("origin", "https://example.com/?task=parent");
  assert(
    !taskSelectionPath("CASE-DEMO-001", "parent", p).includes("example.com"),
  );
});

test("Alternative task links open the workspace with its exact entity and preserve the return task", () => {
  const c = base();
  const { tasks, recommended } = deriveTasks(c);
  const params = new URLSearchParams({
    task: recommended!.id,
    parent: "parent-task",
    origin: `/cases/${c.id}/continue?task=parent-task`,
  });
  const before = JSON.stringify(c);
  const originalParams = params.toString();
  for (const task of tasks.filter(t => t.route)) {
    const destination = new URL(taskWorkspacePath(c.id, task, params), "https://test.local");
    const expected = new URL(task.route!, "https://test.local");
    assert.equal(destination.pathname, expected.pathname);
    for (const [key, value] of expected.searchParams)
      assert.equal(destination.searchParams.get(key), value);
    assert.equal(destination.searchParams.get("returnTo"), `/cases/${c.id}/continue?${params}`);
  }
  assert.equal(JSON.stringify(c), before);
  assert.equal(params.toString(), originalParams);
});

test("Tasks without a workspace stay actionable in the guided task; foreign routes cannot be opened", () => {
  const c = base();
  const task = { ...deriveTasks(c).tasks.find(t => t.type === "advance")!, route: undefined };
  const params = new URLSearchParams({ task: "current" });
  const expected = taskSelectionPath(c.id, task.id, params);
  assert.equal(taskWorkspacePath(c.id, task, params), expected);
  assert.equal(taskWorkspacePath(c.id, { ...task, route: "https://example.com" }, params), expected);
  assert.equal(taskWorkspacePath(c.id, { ...task, route: "/cases/OTHER/sources" }, params), expected);
});

test("Every generated task has a working surface, including stage entry and Discovery checkpoint", () => {
  const c = base();
  const before = JSON.stringify(c);
  const tasks = deriveTasks(c).tasks;
  const params = new URLSearchParams({ task: "current" });
  for (const task of tasks) {
    assert(task.route, `Missing workspace: ${task.type}:${task.target}`);
    const destination = new URL(taskWorkspacePath(c.id, task, params), "https://test.local");
    assert.notEqual(destination.pathname, `/cases/${c.id}/continue`);
  }
  const routeOf = (type: string, target: string) => new URL(taskWorkspacePath(c.id,
    tasks.find(t => t.type === type && t.target === target)!, params), "https://test.local");
  assert.equal(routeOf("advance", "discovery").pathname, `/cases/${c.id}/discovery`);
  assert.equal(routeOf("advance", "formation").pathname, `/cases/${c.id}/requirements`);
  assert.equal(routeOf("checkpoint", "discovery").pathname, `/cases/${c.id}/discovery`);
  assert.equal(routeOf("checkpoint", "discovery").searchParams.get("view"), "checkpoint");
  assert.equal(JSON.stringify(c), before, "Opening a workspace must not advance business state");
});

test("Rendered alternative links point to Sources workspace, rather than another Continue task", () => {
  const c = base();
  const state = deriveTasks(c);
  const current = state.recommended!;
  const entry = `/cases/${c.id}/continue?task=${encodeURIComponent(current.id)}`;
  const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [entry] },
    createElement(TaskNavigator, { c, current, tasks: state.tasks, recommended: current, frontier: state.frontier }),
  ));
  const list = html.match(/<ul class="task-nav-short"[^>]*>([\s\S]*?)<\/ul>/)?.[1];
  assert(list, "The alternative-task list should be rendered");
  const links = [...list.matchAll(/href="([^"]+)"/g)].map(match =>
    new URL(match[1].replaceAll("&amp;", "&"), "https://test.local"),
  );
  assert(links.length > 0);
  for (const link of links) {
    assert.equal(link.pathname, `/cases/${c.id}/sources`);
    assert.equal(link.searchParams.get("returnTo"), entry);
  }
  assert(links.some(link => link.searchParams.get("extracted") === "EXT-1"));
  assert(links.some(link => link.searchParams.get("extracted") === "EXT-2"));
});
