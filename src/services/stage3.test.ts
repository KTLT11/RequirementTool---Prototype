import test from "node:test";
import assert from "node:assert/strict";
import { createDemoBaseline, stageOrder } from "../data/cases";
import { transition } from "./caseTransitions";
import { reconcileGaps } from "./discoveryService";
import {
  layer2,
  initialLayer2,
  blankRequirement,
  requirementQuality,
} from "./requirementService";
import {
  evaluateRequirement,
  reviewableChecks,
  checkFingerprint,
} from "./validationService";
import { resetDemo } from "./demoResetService";
import type { WorkCase } from "../types/case";
import type { Requirement, Layer2Command } from "../types/requirement";
function base() {
  const c = createDemoBaseline();
  c.layer2 = initialLayer2(true);
  c.discovery.gaps = reconcileGaps(c);
  return c;
}
const act = (c: WorkCase, command: Layer2Command) =>
  transition(c, { type: "layer2", command });
const find = (c: WorkCase, r: string, check: string) =>
  layer2(c).results.find((x) => x.requirementId === r && x.checkId === check)!;
test("Decomposition preserves AC allocation/source links, archives parent and blocks loss", () => {
  let c = base();
  const r = c.layer2!.requirements[0];
  assert.throws(
    () =>
      act(c, {
        op: "split",
        id: r.id,
        children: [
          { title: "a", statement: "a", acIds: [], evidenceIds: [] },
          { title: "b", statement: "b", acIds: [], evidenceIds: [] },
        ],
      }),
    /AC/,
  );
  c = act(c, {
    op: "split",
    id: r.id,
    children: [
      {
        title: "Eligibility",
        statement: "Review eligibility",
        acIds: [r.ac[0].id],
        evidenceIds: ["EVI-14"],
      },
      {
        title: "Policy review",
        statement: "Clarify policy",
        acIds: [],
        evidenceIds: ["EVI-30"],
      },
    ],
  });
  const children = c.layer2!.requirements.filter((x) => x.parentId === r.id);
  assert.equal(children.length, 2);
  assert.equal(c.layer2!.requirements[0].status, "Archived");
  assert.equal(children.flatMap((x) => x.ac).length, 1);
  assert.equal(children[0].ac[0].id, r.ac[0].id);
  assert(
    children.every(
      (x) => x.status === "Draft" && x.questionIds.includes("RULE-Q-06"),
    ),
  );
});
test("Applicability N/A requires BA basis and cannot hide known critical scenarios", () => {
  let c = base();
  let r = structuredClone(c.layer2!.requirements[1]);
  r.coverageApplicability = "N/A";
  r.scenarios = [];
  r.ac = r.ac.map((a) => ({ ...a, scenarioIds: [] }));
  c = act(c, { op: "save", requirement: r });
  c = act(c, {
    op: "review",
    id: r.id,
    checkId: "AC-CHK-03",
    status: "Pass",
    reviewer: "BA",
    basis: "Attempt N/A",
  });
  assert.equal(
    evaluateRequirement(c, c.layer2!.requirements[1]).find(
      (x) => x.checkId === "AC-CHK-03",
    )!.status,
    "Fail",
  );
  const nfr = blankRequirement("REQ-NFR", "Measured", "NFR");
  nfr.coverageApplicability = "N/A";
  nfr.applicabilityBasis =
    "Không có business rule, permission hoặc exception trong scope";
  c.layer2!.requirements.push(nfr);
  c = act(c, {
    op: "review",
    id: nfr.id,
    checkId: "AC-CHK-03",
    status: "Pass",
    reviewer: "BA",
    basis: "Đối chiếu scope NFR",
  });
  assert.equal(
    evaluateRequirement(c, c.layer2!.requirements.at(-1)!).find(
      (x) => x.checkId === "AC-CHK-03",
    )!.status,
    "N/A",
  );
});
test("CRUD, source formation, AC edits, archive and serialization preserve identity/history", () => {
  let c = act(base(), {
    op: "create",
    title: "From refund question",
    module: "Business Rule",
    questionIds: ["RULE-Q-06"],
    evidenceIds: ["EVI-30"],
  });
  let r = structuredClone(layer2(c).requirements.at(-1)!);
  assert.equal(r.status, "Draft");
  assert.equal(r.origin, "Discovery template");
  assert.deepEqual(r.evidenceIds, ["EVI-30"]);
  assert.match(r.statement, /đề xuất/);
  r.title = "Edited";
  r.ac = [
    {
      id: "AC-CRUD",
      title: "condition",
      format: "Condition/Outcome",
      condition: "x",
      input: "y",
      outcome: "z",
      verification: "check",
      scenarioIds: [],
      evidenceIds: [],
      status: "Draft",
    },
  ];
  c = act(c, { op: "save", requirement: r });
  assert.equal(layer2(c).requirements.at(-1)!.revision, 2);
  r = structuredClone(layer2(c).requirements.at(-1)!);
  r.ac[0].outcome = "new";
  r.evidenceIds = [];
  c = act(c, { op: "save", requirement: r });
  assert.equal(layer2(c).requirements.at(-1)!.ac[0].outcome, "new");
  assert.deepEqual(layer2(c).requirements.at(-1)!.evidenceIds, []);
  r = structuredClone(layer2(c).requirements.at(-1)!);
  r.ac = [];
  c = act(c, { op: "save", requirement: r });
  c = act(c, { op: "archive", id: r.id });
  assert.equal(layer2(c).requirements.at(-1)!.status, "Archived");
  assert(c.history.length >= 5);
  assert.deepEqual(layer2(JSON.parse(JSON.stringify(c))), layer2(c));
});
test("Requirement drafts do not mutate canonical validation input; block validation until save", () => {
  let c = base();
  const r = structuredClone(layer2(c).requirements[1]);
  r.statement = "draft";
  const v = c.version;
  c = act(c, { op: "draft", requirement: r });
  assert.equal(c.version, v);
  assert.notEqual(layer2(c).requirements[1].statement, "draft");
  assert.throws(() => act(c, { op: "validate", ids: [r.id] }), /draft/);
  assert.equal(
    layer2(JSON.parse(JSON.stringify(c))).drafts[r.id].statement,
    "draft",
  );
  c = act(c, { op: "discard", id: r.id });
  assert(!layer2(c).drafts[r.id]);
});
test("Missing structured AC coverage generates rule finding; text keyword cannot resolve it", () => {
  let c = base();
  let r = structuredClone(layer2(c).requirements[1]);
  c = act(c, { op: "validate", ids: [r.id] });
  assert.equal(find(c, r.id, "AC-CHK-03").status, "Fail");
  r.ac[0].outcome += " timeout unknown duplicate";
  c = act(c, { op: "save", requirement: r });
  c = act(c, { op: "validate", ids: [r.id] });
  assert.equal(find(c, r.id, "AC-CHK-03").status, "Fail");
  r = structuredClone(layer2(c).requirements[1]);
  r.ac.push({
    id: "AC-EDGE",
    title: "Unknown outcome",
    format: "Given/When/Then",
    condition: "Không có response / kết quả không rõ",
    input: "Request gốc",
    outcome: "Giữ chưa xác định, đối soát trước gửi lại",
    verification: "Kiểm tra request và số giao dịch",
    scenarioIds: ["no-response", "unknown-outcome", "duplicate"],
    evidenceIds: [],
    status: "Draft",
  });
  c = act(c, { op: "save", requirement: r });
  c = act(c, { op: "validate", ids: [r.id] });
  assert.equal(find(c, r.id, "AC-CHK-03").status, "Unknown");
  c = act(c, {
    op: "review",
    id: r.id,
    checkId: "AC-CHK-03",
    status: "Pass",
    reviewer: "BA",
    basis: "Đã đối chiếu coverage và applicability với scope đã chọn",
  });
  c = act(c, { op: "validate", ids: [r.id] });
  assert.equal(find(c, r.id, "AC-CHK-03").status, "Pass");
  assert.equal(find(c, r.id, "REQ-QC-08").status, "Unknown");
});
test("Business judgment cannot override missing AC, missing fields, unconfirmed sources or conflict", () => {
  let c = base();
  let r = structuredClone(layer2(c).requirements[0]);
  r.ac = [];
  c = act(c, { op: "save", requirement: r });
  for (const id of reviewableChecks)
    c = act(c, {
      op: "review",
      id: r.id,
      checkId: id,
      status: "Pass",
      reviewer: "BA",
      basis: "review attempt",
    });
  c = act(c, { op: "validate", ids: [r.id] });
  assert.equal(find(c, r.id, "REQ-QC-08").status, "Fail");
  assert.equal(find(c, r.id, "AC-CHK-01").status, "Fail");
  assert.equal(find(c, r.id, "AC-CHK-05").status, "Fail");
  assert.equal(find(c, r.id, "REQ-QC-06").status, "Fail");
});
test("Module applicability exposes Pass Fail Unknown N/A and deterministic results", () => {
  const c = base();
  const nfr = blankRequirement("REQ-NFR", "Latency", "NFR");
  let values = evaluateRequirement(c, nfr);
  assert.equal(values.find((x) => x.checkId === "STRUCT-ACTOR")!.status, "N/A");
  assert.equal(values.find((x) => x.checkId === "REQ-QC-02")!.status, "Fail");
  assert.equal(
    values.find((x) => x.checkId === "REQ-QC-01")!.status,
    "Unknown",
  );
  assert.deepEqual(values, evaluateRequirement(c, nfr));
  const process = blankRequirement("REQ-P", "Flow", "Process");
  assert.equal(
    evaluateRequirement(c, process).find((x) => x.checkId === "STRUCT-ACTOR")!
      .status,
    "Fail",
  );
  process.fields.actor = "Operations";
  assert.equal(
    evaluateRequirement(c, process).find((x) => x.checkId === "STRUCT-ACTOR")!
      .status,
    "Pass",
  );
});
test("Unconfirmed and assumption evidence are never considered confirmed", () => {
  const c = base();
  const r = c.layer2!.requirements[0];
  c.discovery.evidence = c.discovery.evidence.filter((e) => e.id !== "EVI-14");
  r.evidenceIds = ["EVI-30"];
  c.discovery.gaps = reconcileGaps(c);
  assert.equal(
    evaluateRequirement(c, r).find((x) => x.checkId === "REQ-QC-08")!.status,
    "Unknown",
  );
  c.discovery.evidence[0].status = "Assumption";
  assert.notEqual(
    evaluateRequirement(c, r).find((x) => x.checkId === "REQ-QC-08")!.status,
    "Pass",
  );
});
test("Evidence and Discovery changes stale only dependent checks and requirements; immutable runs remain", () => {
  let c = act(base(), {
    op: "validate",
    ids: layer2(base()).requirements.map((r) => r.id),
  });
  const run = structuredClone(c.layer2!.runs[0]);
  c = transition(c, {
    type: "response",
    questionId: "RULE-Q-06",
    text: "31 ngày",
    sourceId: "ST-POL",
  });
  assert.equal(find(c, "REQ-REF-001", "REQ-QC-08").freshness, "Stale");
  assert.equal(find(c, "REQ-REF-001", "STRUCT-ACTOR").freshness, "Current");
  assert.equal(find(c, "REQ-REF-002", "REQ-QC-08").freshness, "Current");
  assert.deepEqual(c.layer2!.runs[0], run);
  assert(
    find(c, "REQ-REF-001", "REQ-QC-08").staleReasons.some((x) =>
      x.includes("RULE-Q-06"),
    ),
  );
  c = act(c, { op: "validate", ids: ["REQ-REF-001"] });
  assert.equal(find(c, "REQ-REF-001", "REQ-QC-08").freshness, "Current");
  assert.equal(c.layer2!.runs.length, 2);
});
test("AC edit stales quality coverage, not independent source checks; mapping and reviews re-evaluate", () => {
  let c = act(base(), { op: "validate", ids: ["REQ-REF-002"] });
  const r = structuredClone(c.layer2!.requirements[1]);
  r.ac[0].outcome = "changed";
  c = act(c, { op: "save", requirement: r });
  assert.equal(find(c, r.id, "AC-CHK-03").freshness, "Stale");
  assert.equal(find(c, r.id, "REQ-QC-08").freshness, "Current");
  assert.equal(find(c, r.id, "STRUCT-ACTOR").freshness, "Current");
  c = act(c, { op: "validate", ids: [r.id] });
  assert.equal(requirementQuality(c, r.id), "Fail");
  assert(!c.layer2!.results.some((x) => x.freshness === "Stale"));
});
test("Superseded extraction-linked evidence and changed related requirement invalidate scope", () => {
  let c = base();
  c = transition(c, {
    type: "ux",
    command: {
      op: "extracted",
      id: "EXT-2",
      status: "Accepted",
      interpretation: "30 ngày",
    },
  });
  c = transition(c, {
    type: "ux",
    command: { op: "link", id: "EXT-2", questionId: "RULE-Q-06" },
  });
  const id = c.ux!.extracted[1].evidenceId!;
  let r = structuredClone(c.layer2!.requirements[0]);
  r.evidenceIds = [id];
  c = act(c, { op: "save", requirement: r });
  c = act(c, { op: "validate", ids: [r.id] });
  c = transition(c, {
    type: "ux",
    command: {
      op: "extracted",
      id: "EXT-2",
      status: "Accepted",
      interpretation: "32 ngày",
    },
  });
  assert.equal(find(c, r.id, "REQ-QC-08").freshness, "Stale");
  assert.equal(
    c.discovery.evidence.find((e) => e.id === id)!.status,
    "Superseded",
  );
  r = structuredClone(c.layer2!.requirements[2]);
  r.relatedIds = ["REQ-REF-002"];
  c = act(c, { op: "save", requirement: r });
  c = act(c, { op: "validate", ids: [r.id] });
  c = act(c, { op: "archive", id: "REQ-REF-002" });
  assert.equal(find(c, r.id, "REQ-QC-04").freshness, "Stale");
  c = act(c, { op: "validate", ids: [r.id] });
  assert.equal(find(c, r.id, "REQ-QC-04").status, "Fail");
});
test("Confirmed structured scope plus BA reviews can be Quality Ready beside unresolved requirements", () => {
  let c = base();
  let r = structuredClone(c.layer2!.requirements[0]);
  r.questionIds = ["CORE-Q-01"];
  r.evidenceIds = [];
  r.fields.rule = "Không thay đổi chính sách; scope riêng đã xác minh";
  c = act(c, { op: "save", requirement: r });
  c = transition(c, {
    type: "response",
    questionId: "CORE-Q-01",
    text: "Giảm theo dõi thủ công",
    sourceId: "ST-OPS",
  });
  const e = c.discovery.responses.find(
    (x) => x.questionId === "CORE-Q-01",
  )!.evidenceId!;
  c = transition(c, { type: "review", evidenceId: e, review: "Reviewed" });
  c = transition(c, {
    type: "confirm",
    evidenceId: e,
    authorityId: "ST-OPS",
    basis: "Scenario authority xác nhận",
  });
  r = structuredClone(c.layer2!.requirements[0]);
  r.evidenceIds = [e];
  c = act(c, { op: "save", requirement: r });
  for (const id of reviewableChecks)
    c = act(c, {
      op: "review",
      id: r.id,
      checkId: id,
      status: "Pass",
      reviewer: "BA",
      basis: "Đối chiếu criterion với scope và source đã xác minh",
    });
  c = act(c, { op: "validate", ids: c.layer2!.requirements.map((r) => r.id) });
  assert.equal(requirementQuality(c, r.id), "Quality Ready");
  assert.equal(requirementQuality(c, "REQ-REF-002"), "Fail");
  assert.equal(c.currentStage, "incoming");
  assert(!c.ux?.customerPreview);
});
for (const stage of stageOrder)
  test(`Layer 2 reset from ${stage} preserves ownership and is repeatable after validation/change`, () => {
    let c = act(base(), { op: "validate", ids: ["REQ-REF-002"] });
    let r = structuredClone(c.layer2!.requirements[1]);
    r.title = "Changed requirement";
    c = act(c, { op: "save", requirement: r });
    c = transition(c, {
      type: "response",
      questionId: "INT-Q-13",
      text: "Clarify owner",
      sourceId: "ST-INT",
    });
    const upstream = structuredClone(c.discovery);
    const beforeL2 = structuredClone(c.layer2);
    const reset = resetDemo(c, stage);
    const again = resetDemo(reset, stage);
    if (stageOrder.indexOf(stage) <= 3)
      assert.deepEqual(reset.layer2, initialLayer2(true));
    else assert.deepEqual(reset.layer2, beforeL2);
    if (stageOrder.indexOf(stage) >= 3)
      assert.deepEqual(reset.discovery, upstream);
    assert.deepEqual(reset.layer2, again.layer2);
    assert.equal(reset.currentStage, stage);
    assert.deepEqual(layer2(JSON.parse(JSON.stringify(reset))), layer2(reset));
  });
