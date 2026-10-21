import test from "node:test";
import assert from "node:assert/strict";
import { createDemoBaseline, stageOrder } from "../data/cases";
import { deriveTasks, selectTask, taskPath, safeReturn } from "./taskService";
import {
  reconcileGaps,
  contextReady,
  discoveryReady,
} from "./discoveryService";
import { transition } from "./caseTransitions";
import { initialLayer2, layer2 } from "./requirementService";
import { resetDemo } from "./demoResetService";
import { casePath } from "../app/navigation";
function base() {
  const c = createDemoBaseline();
  c.discovery.gaps = reconcileGaps(c);
  c.layer2 = initialLayer2(true);
  return c;
}
test("Same state deterministically selects Context before conflict, independent of stage/replay", () => {
  const c = base();
  const original = structuredClone(c);
  assert.equal(deriveTasks(c).recommended?.type, "context");
  assert.deepEqual(deriveTasks(c), deriveTasks(c));
  assert.deepEqual(c, original);
  c.currentStage = "handoff";
  assert.equal(deriveTasks(c).recommended?.type, "context");
});
test("Context completion is canonical; accept alone does not complete or advance", () => {
  let c = base();
  c = transition(c, { type: "suggestion", outcome: "Accepted" });
  assert(!contextReady(c));
  assert(!deriveTasks(c).tasks.find((t) => t.type === "context")!.complete);
  c = transition(c, { type: "contextReview" });
  assert(contextReady(c));
  assert(deriveTasks(c).tasks.find((t) => t.type === "context")!.complete);
  assert.equal(deriveTasks(c).recommended?.target, "discovery");
});
test("Intent pins completed task until BA chooses Continue; alternative conflict has parent return", () => {
  let c = base();
  const id = deriveTasks(c).recommended!.id;
  c = transition(c, { type: "suggestion", outcome: "Accepted" });
  c = transition(c, { type: "contextReview" });
  assert.equal(selectTask(c, id).selected?.id, id);
  assert(selectTask(c, id).selected?.complete);
  const gap = deriveTasks(c).tasks.find((t) => t.type === "gap")!;
  const e = deriveTasks(c).tasks.find((t) => t.type === "evidence")!;
  assert.match(taskPath(c.id, e.id, gap.id), /parent=/);
  assert.equal(
    safeReturn(c.id, taskPath(c.id, gap.id)),
    taskPath(c.id, gap.id),
  );
  assert.equal(safeReturn(c.id, "https://external.test"), null);
  assert.equal(safeReturn("other", taskPath(c.id, gap.id)), null);
});
test("Conflict and evidence tasks keep authority/confirmation gates; Review does not complete", () => {
  let c = base();
  c = transition(c, { type: "suggestion", outcome: "Accepted" });
  c = transition(c, { type: "contextReview" });
  c = transition(c, { type: "advance", stage: "discovery" });
  assert.equal(deriveTasks(c).recommended?.type, "gap");
  c = transition(c, {
    type: "review",
    evidenceId: "EVI-30",
    review: "Reviewed",
  });
  assert(
    !deriveTasks(c).tasks.find(
      (t) => t.type === "evidence" && t.target === "EVI-30",
    )!.complete,
  );
  assert.throws(() =>
    transition(c, {
      type: "confirm",
      evidenceId: "EVI-30",
      authorityId: "ST-OPS",
      basis: "attempt",
    }),
  );
  assert(!discoveryReady(c));
});
test("Selectors/read-only exploration do not dispatch, mutate snapshots or history", () => {
  const c = base();
  const before = JSON.stringify(c);
  for (const stage of stageOrder)
    deriveTasks(c).tasks.filter((t) => t.stage === stage);
  assert.equal(JSON.stringify(c), before);
});
test("Default entry, deep supporting targets and removed target are explicit", () => {
  const c = base();
  assert.equal(casePath(c.id), `/cases/${c.id}/continue`);
  assert.equal(casePath(c.id, "quality"), `/cases/${c.id}/quality`);
  const t = deriveTasks(c).tasks.find((t) => t.type === "edit")!;
  assert(t.route?.includes("requirement=REQ-REF-001"));
  assert(selectTask(c, "no-longer-valid").missing);
});
test("Persisted question/requirement draft disables scope validation without false completion", () => {
  let c = base();
  const r = structuredClone(layer2(c).requirements[1]);
  r.statement = "unfinished";
  c = transition(c, {
    type: "layer2",
    command: { op: "draft", requirement: r },
  });
  const task = deriveTasks(c).tasks.find(
    (t) => t.type === "validate" && t.target === r.id,
  )!;
  assert(!task.available);
  assert(task.preconditions.length);
  c = transition(c, {
    type: "ux",
    command: {
      op: "draft",
      questionId: "INT-Q-13",
      text: "Kept draft",
      source: "ST-INT",
    },
  });
  assert.equal(
    JSON.parse(JSON.stringify(c)).ux.drafts["INT-Q-13"].text,
    "Kept draft",
  );
  assert.equal(selectTask(c, task.id).selected?.id, task.id);
});
test("Current/Stale findings derive from engine, unaffected validation scopes remain available", () => {
  let c = base();
  c = transition(c, {
    type: "layer2",
    command: { op: "validate", ids: ["REQ-REF-001", "REQ-REF-002"] },
  });
  let t = deriveTasks(c).tasks.find(
    (t) =>
      t.type === "finding" &&
      t.target.endsWith("AC-CHK-03") &&
      t.scope[0] === "REQ-REF-002",
  )!;
  assert(!t.complete);
  c = transition(c, {
    type: "response",
    questionId: "RULE-Q-06",
    sourceId: "ST-POL",
    text: "31 ngày",
  });
  assert(
    deriveTasks(c).tasks.some(
      (t) =>
        t.type === "finding" &&
        t.blockers.length &&
        t.scope[0] === "REQ-REF-001",
    ),
  );
  assert(
    !deriveTasks(c).tasks.find(
      (t) => t.type === "validate" && t.target === "REQ-REF-002",
    )!.complete === false,
  );
});
test("Changes Requested and Accepted with Blocker create loops, not Case completion", () => {
  const c = base();
  c.confirmation.outcome = "Changes Requested";
  c.confirmation.changeRequests = "Điều chỉnh AC";
  assert(
    deriveTasks(c).tasks.some(
      (t) => t.type === "changes" && t.inputs[0].value === "Điều chỉnh AC",
    ),
  );
  c.devReview.outcome = "Accepted with Blocker";
  c.devReview.blockers = "Contract chưa có";
  assert(
    deriveTasks(c).tasks.some(
      (t) => t.type === "changes" && t.target === "dev" && !t.complete,
    ),
  );
  assert.equal(c.status, "In Progress");
});
for (const stage of stageOrder)
  test(`Reset ${stage} re-derives tasks from actual gates, no task status store`, () => {
    let c = base();
    c = transition(c, {
      type: "layer2",
      command: { op: "validate", ids: ["REQ-REF-002"] },
    });
    c = resetDemo(c, stage);
    assert.deepEqual(deriveTasks(c), deriveTasks(c));
    assert.equal(
      deriveTasks(c).tasks.find((t) => t.type === "context")?.complete,
      contextReady(c),
    );
  });
