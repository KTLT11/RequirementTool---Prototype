import test from "node:test";
import assert from "node:assert/strict";
import { createDemoBaseline, stageOrder } from "../data/cases";
import { transition } from "./caseTransitions";
import { reconcileGaps } from "./discoveryService";
import {
  layer2,
  initialLayer2,
  requirementQuality,
} from "./requirementService";
import { reviewableChecks } from "./validationService";
import {
  buildCrdSections,
  buildDrdSections,
  devReadiness,
} from "./documentService";
import { resetDemo } from "./demoResetService";
import { backfillCase } from "./migrationService";
import type { WorkCase } from "../types/case";
import type { Layer2Command } from "../types/requirement";

function base() {
  const c = createDemoBaseline();
  c.layer2 = initialLayer2(true);
  c.discovery.gaps = reconcileGaps(c);
  return c;
}
const act = (c: WorkCase, command: Layer2Command) =>
  transition(c, { type: "layer2", command });

function makeQualityReady(c: WorkCase, reqId: string): WorkCase {
  let r = structuredClone(c.layer2!.requirements.find((x) => x.id === reqId)!);
  r.questionIds = ["CORE-Q-01"];
  r.evidenceIds = [];
  c = act(c, { op: "save", requirement: r });
  c = transition(c, {
    type: "response",
    questionId: "CORE-Q-01",
    text: "Giảm theo dõi thủ công",
    sourceId: "ST-OPS",
  });
  const e = c.discovery.responses.find((x) => x.questionId === "CORE-Q-01")!
    .evidenceId!;
  c = transition(c, { type: "review", evidenceId: e, review: "Reviewed" });
  c = transition(c, {
    type: "confirm",
    evidenceId: e,
    authorityId: "ST-OPS",
    basis: "Scenario authority xác nhận",
  });
  r = structuredClone(c.layer2!.requirements.find((x) => x.id === reqId)!);
  r.evidenceIds = [e];
  c = act(c, { op: "save", requirement: r });
  for (const id of reviewableChecks)
    c = act(c, {
      op: "review",
      id: reqId,
      checkId: id,
      status: "Pass",
      reviewer: "BA",
      basis: "Đối chiếu criterion với scope và source đã xác minh",
    });
  c = act(c, { op: "validate", ids: [reqId] });
  return c;
}

test("Partial Confirmation only marks the selected scope", () => {
  let c = base();
  c = act(c, { op: "validate", ids: c.layer2!.requirements.map((r) => r.id) });
  c = transition(c, {
    type: "confirmCustomer",
    scopeReqIds: ["REQ-REF-001"],
    outcome: "Partially Confirmed",
    approverRole: "Policy Owner",
    approverIdentity: "Policy Owner demo",
    basis: "Xác nhận phạm vi REQ-REF-001",
  });
  assert.deepEqual(c.confirmation.scopeReqIds, ["REQ-REF-001"]);
  assert.equal(c.confirmation.outcome, "Partially Confirmed");
});

test("Customer Confirmation rejects requirement never validated", () => {
  const c = base();
  assert.throws(
    () =>
      transition(c, {
        type: "confirmCustomer",
        scopeReqIds: ["REQ-REF-001"],
        outcome: "Confirmed",
        approverRole: "Policy Owner",
        approverIdentity: "Policy Owner demo",
        basis: "basis",
      }),
    /validation/,
  );
});

test("Dev Readiness is Not Ready without confirmation even if Quality Ready", () => {
  let c = base();
  c = act(c, { op: "validate", ids: ["REQ-REF-001"] });
  const r = devReadiness(c, ["REQ-REF-001"]);
  assert.equal(r.status, "Not Ready");
});

test("Dev Readiness is Ready but Blocked when a related requirement outside scope is not Quality Ready", () => {
  let c = base();
  c = makeQualityReady(c, "REQ-REF-001");
  assert.equal(requirementQuality(c, "REQ-REF-001"), "Quality Ready");
  assert.notEqual(requirementQuality(c, "REQ-REF-002"), "Quality Ready");
  let r = structuredClone(c.layer2!.requirements.find((x) => x.id === "REQ-REF-001")!);
  r.relatedIds = ["REQ-REF-002"];
  c = act(c, { op: "save", requirement: r });
  for (const id of reviewableChecks)
    c = act(c, {
      op: "review",
      id: "REQ-REF-001",
      checkId: id,
      status: "Pass",
      reviewer: "BA",
      basis: "Đối chiếu criterion với scope và source đã xác minh",
    });
  c = act(c, { op: "validate", ids: ["REQ-REF-001"] });
  assert.equal(requirementQuality(c, "REQ-REF-001"), "Quality Ready");
  c = transition(c, {
    type: "confirmCustomer",
    scopeReqIds: ["REQ-REF-001"],
    outcome: "Confirmed",
    approverRole: "Policy Owner",
    approverIdentity: "Policy Owner demo",
    basis: "basis",
  });
  const result = devReadiness(c, ["REQ-REF-001"]);
  assert.equal(result.status, "Ready but Blocked");
  assert(result.reasons.some((x) => x.includes("REQ-REF-002")));
});

test("Dev Review throws when scope is not Customer Confirmed", () => {
  const c = base();
  assert.throws(
    () =>
      transition(c, {
        type: "devReview",
        scopeReqIds: ["REQ-REF-001"],
        outcome: "Accepted",
        reviewer: "Dev lead",
        basis: "basis",
      }),
    /Confirmation/,
  );
});

test("CRD has 10 sections C01-C10 in order; DRD hides inapplicable sections", () => {
  const c = base();
  const ids = c.layer2!.requirements.map((r) => r.id);
  const crd = buildCrdSections(c, ids);
  assert.equal(crd.length, 10);
  assert.deepEqual(
    crd.map((s) => s.code),
    ["C01", "C02", "C03", "C04", "C05", "C06", "C07", "C08", "C09", "C10"],
  );
  const drd = buildDrdSections(c, ids);
  assert.equal(drd.length, 12);
  const d07 = drd.find((s) => s.code === "D07")!;
  assert.equal(d07.applies, false, "no Permission requirement in demo scope");
});

test("QG-06 B3.1: Requirement with an open source Conflict is presented as conflicting, never Confirmed", () => {
  const c = base();
  const gap = c.discovery.gaps.find((g) => g.questionId === "RULE-Q-06")!;
  assert.equal(gap.type, "Conflict", "demo 14/30 evidence must seed an open conflict");
  const req = c.layer2!.requirements.find((r) => r.id === "REQ-REF-001")!;
  assert.deepEqual(req.evidenceIds, ["EVI-14", "EVI-30"]);
  const crd = buildCrdSections(c, ["REQ-REF-001"]);
  const c07 = crd.find((s) => s.code === "C07")!;
  assert.match(c07.body, /Source Confidence: Thông tin đang mâu thuẫn/);
  assert.doesNotMatch(c07.body, /Source Confidence: Đã xác nhận/);
});

test("QG-06 B3.1: Requirement with no linked Evidence or Gap is presented as insufficient information", () => {
  const c = base();
  let r = structuredClone(c.layer2!.requirements.find((x) => x.id === "REQ-REF-002")!);
  r.questionIds = [];
  r.evidenceIds = [];
  const c2 = act(c, { op: "save", requirement: r });
  const crd = buildCrdSections(c2, ["REQ-REF-002"]);
  const c07 = crd.find((s) => s.code === "C07")!;
  assert.match(c07.body, /Source Confidence: Thiếu thông tin — chưa có nguồn xác nhận$/m);
});

test("QG-06 B3.1: Requirement backed only by a Confirmed, non-conflicting Evidence is presented as confirmed", () => {
  let c = base();
  c = makeQualityReady(c, "REQ-REF-001");
  const req = c.layer2!.requirements.find((x) => x.id === "REQ-REF-001")!;
  assert.equal(req.evidenceIds.length, 1, "makeQualityReady replaces conflicting evidence with one confirmed source");
  const crd = buildCrdSections(c, ["REQ-REF-001"]);
  const c07 = crd.find((s) => s.code === "C07")!;
  assert.match(c07.body, /Source Confidence: Đã xác nhận theo nguồn có thẩm quyền/);
});

test("QG-06 B3.1: Requirement backed only by Superseded Evidence is never shown as a current fact", () => {
  let c = base();
  c = makeQualityReady(c, "REQ-REF-001");
  const evId = c.layer2!.requirements.find((x) => x.id === "REQ-REF-001")!.evidenceIds[0];
  const e = structuredClone(c.discovery.evidence.find((x) => x.id === evId)!);
  e.status = "Superseded";
  c = { ...c, discovery: { ...c.discovery, evidence: c.discovery.evidence.map((x) => (x.id === evId ? e : x)) } };
  const crd = buildCrdSections(c, ["REQ-REF-001"]);
  const c07 = crd.find((s) => s.code === "C07")!;
  assert.match(c07.body, /Source Confidence: Đã thay thế — không dùng làm current fact/);
});

test("QG-06 B3.1: Evidence Reviewed but not yet Confirmed (no open conflict) is presented as BA-refined, not Confirmed", () => {
  const c = base();
  let r = structuredClone(c.layer2!.requirements.find((x) => x.id === "REQ-REF-002")!);
  r.questionIds = ["CORE-Q-01"];
  r.evidenceIds = ["EVI-01"];
  const c2 = act(c, { op: "save", requirement: r });
  const e = c2.discovery.evidence.find((x) => x.id === "EVI-01")!;
  assert.equal(e.review, "Reviewed");
  assert.equal(e.status, "Unconfirmed");
  const crd = buildCrdSections(c2, ["REQ-REF-002"]);
  const c07 = crd.find((s) => s.code === "C07")!;
  assert.match(c07.body, /Source Confidence: Đã BA review — đang chờ xác nhận chính thức/);
});

test("QG-06 B3.1: Evidence neither Reviewed nor Confirmed (no open conflict) is presented as proposed, pending decision", () => {
  const c = base();
  let r = structuredClone(c.layer2!.requirements.find((x) => x.id === "REQ-REF-002")!);
  r.questionIds = ["PROC-Q-09"];
  r.evidenceIds = ["EVI-04"];
  const c2 = act(c, { op: "save", requirement: r });
  assert.equal(
    c2.discovery.evidence.find((e) => e.id === "EVI-04")!.review,
    "Pending Review",
  );
  const crd = buildCrdSections(c2, ["REQ-REF-002"]);
  const c07 = crd.find((s) => s.code === "C07")!;
  assert.match(c07.body, /Source Confidence: Phương án đề xuất — cần xác nhận/);
});

test("QG-06: creating a new CRD/DRD snapshot after resolving the source conflict reflects the updated confidence; the earlier snapshot stays untouched", () => {
  let c = base();
  c = transition(c, {
    type: "snapshot",
    audience: "CRD",
    scopeReqIds: ["REQ-REF-001"],
  });
  const staleSnap = c.snapshots.find((s) => s.audience === "CRD")!;
  const staleC07 = staleSnap.sections.find((s) => s.code === "C07")!;
  assert.match(staleC07.body, /Source Confidence: Thông tin đang mâu thuẫn/);

  c = makeQualityReady(c, "REQ-REF-001");
  c = transition(c, {
    type: "confirmCustomer",
    scopeReqIds: ["REQ-REF-001"],
    outcome: "Confirmed",
    approverRole: "Policy Owner",
    approverIdentity: "Policy Owner demo",
    basis: "Conflict đã được giải quyết theo Evidence có thẩm quyền",
  });
  c = transition(c, {
    type: "snapshot",
    audience: "CRD",
    scopeReqIds: ["REQ-REF-001"],
  });
  const newSnap = c.snapshots.filter((s) => s.audience === "CRD").at(-1)!;
  const newC07 = newSnap.sections.find((s) => s.code === "C07")!;
  assert.match(newC07.body, /Source Confidence: Đã xác nhận theo nguồn có thẩm quyền/);

  // The first snapshot must remain exactly as it was taken.
  const staleSnapAfter = c.snapshots.find((s) => s.id === staleSnap.id)!;
  assert.deepEqual(staleSnapAfter.sections, staleSnap.sections);
});

test("Snapshot is immutable after later requirement edits", () => {
  let c = base();
  c = act(c, { op: "validate", ids: ["REQ-REF-001"] });
  c = transition(c, {
    type: "snapshot",
    audience: "CRD",
    scopeReqIds: ["REQ-REF-001"],
  });
  const snap = c.snapshots.find((s) => s.audience === "CRD")!;
  const before = JSON.stringify(snap.sections);
  const r = structuredClone(c.layer2!.requirements[0]);
  r.title = "Changed after snapshot";
  c = act(c, { op: "save", requirement: r });
  const after = c.snapshots.find((s) => s.id === snap.id)!;
  assert.equal(JSON.stringify(after.sections), before);
});

test("Stale input after confirmation flags preview without reverting outcome", () => {
  let c = base();
  c = makeQualityReady(c, "REQ-REF-001");
  c = transition(c, {
    type: "confirmCustomer",
    scopeReqIds: ["REQ-REF-001"],
    outcome: "Confirmed",
    approverRole: "Policy Owner",
    approverIdentity: "Policy Owner demo",
    basis: "basis",
  });
  assert.equal(c.previews.customer.status, "Viewed");
  const r = structuredClone(c.layer2!.requirements[0]);
  r.title = "Changed after confirmation";
  c = act(c, { op: "save", requirement: r });
  assert.equal(c.previews.customer.status, "Stale");
  assert.equal(c.confirmation.outcome, "Confirmed");
});

test("Reset at 'customer' keeps Layer 2 but clears Dev Review/DRD snapshot; reset at 'formation' clears all Stage 4 records", () => {
  let c = base();
  c = makeQualityReady(c, "REQ-REF-001");
  c = transition(c, {
    type: "confirmCustomer",
    scopeReqIds: ["REQ-REF-001"],
    outcome: "Confirmed",
    approverRole: "Policy Owner",
    approverIdentity: "Policy Owner demo",
    basis: "basis",
  });
  c = transition(c, {
    type: "devReview",
    scopeReqIds: ["REQ-REF-001"],
    outcome: "Accepted",
    reviewer: "Dev lead",
    basis: "basis",
  });
  c = transition(c, {
    type: "snapshot",
    audience: "CRD",
    scopeReqIds: ["REQ-REF-001"],
  });
  c = transition(c, {
    type: "snapshot",
    audience: "DRD",
    scopeReqIds: ["REQ-REF-001"],
  });
  const resetCustomer = resetDemo(c, "customer");
  assert.deepEqual(resetCustomer.layer2, c.layer2);
  assert.equal(resetCustomer.confirmation.outcome, "Pending");
  assert.equal(resetCustomer.devReview.outcome, "Pending");
  assert.equal(resetCustomer.snapshots.length, 0);
  const resetFormation = resetDemo(c, "formation");
  assert.deepEqual(resetFormation.layer2, initialLayer2(true));
  assert.equal(resetFormation.confirmation.outcome, "Pending");
  assert.equal(resetFormation.devReview.outcome, "Pending");
  assert.equal(resetFormation.snapshots.length, 0);
  const resetHandoff = resetDemo(c, "handoff");
  assert.equal(resetHandoff.confirmation.outcome, "Confirmed");
  assert.equal(resetHandoff.devReview.outcome, "Pending");
  assert.equal(
    resetHandoff.snapshots.filter((s) => s.audience === "DRD").length,
    0,
  );
  assert.equal(
    resetHandoff.snapshots.filter((s) => s.audience === "CRD").length,
    1,
  );
});

test("localStorage migration backfills missing Stage 4 fields without losing existing data", () => {
  const c = base();
  const legacy = JSON.parse(JSON.stringify(c)) as Record<string, unknown>;
  delete legacy.confirmation;
  delete legacy.devReview;
  delete legacy.snapshots;
  const migrated = backfillCase(legacy as unknown as WorkCase);
  assert.equal(migrated.confirmation.outcome, "Pending");
  assert.equal(migrated.devReview.outcome, "Pending");
  assert.deepEqual(migrated.snapshots, []);
  assert.equal(migrated.id, c.id);
  assert.deepEqual(migrated.layer2, c.layer2);
});

for (const stage of stageOrder)
  test(`resetDemo(${stage}) remains repeatable with Stage 4 fields present`, () => {
    const c = base();
    const reset = resetDemo(c, stage);
    const again = resetDemo(reset, stage);
    assert.deepEqual(reset.confirmation, again.confirmation);
    assert.deepEqual(reset.devReview, again.devReview);
    assert.deepEqual(reset.snapshots, again.snapshots);
  });

function withConfirmedAndSnapshots(): WorkCase {
  let c = base();
  let r = structuredClone(c.layer2!.requirements[0]);
  r.questionIds = ["CORE-Q-01"];
  r.evidenceIds = [];
  c = act(c, { op: "save", requirement: r });
  c = transition(c, {
    type: "response",
    questionId: "CORE-Q-01",
    text: "Giảm theo dõi thủ công",
    sourceId: "ST-OPS",
  });
  const e = c.discovery.responses.find((x) => x.questionId === "CORE-Q-01")!
    .evidenceId!;
  c = transition(c, { type: "review", evidenceId: e, review: "Reviewed" });
  c = transition(c, {
    type: "confirm",
    evidenceId: e,
    authorityId: "ST-OPS",
    basis: "basis",
  });
  r = structuredClone(c.layer2!.requirements.find((x) => x.id === "REQ-REF-001")!);
  r.evidenceIds = [e];
  c = act(c, { op: "save", requirement: r });
  for (const id of reviewableChecks)
    c = act(c, {
      op: "review",
      id: "REQ-REF-001",
      checkId: id,
      status: "Pass",
      reviewer: "BA",
      basis: "basis",
    });
  c = act(c, { op: "validate", ids: ["REQ-REF-001"] });
  c = transition(c, {
    type: "confirmCustomer",
    scopeReqIds: ["REQ-REF-001"],
    outcome: "Confirmed",
    approverRole: "Policy Owner",
    approverIdentity: "Policy Owner demo",
    basis: "basis",
  });
  c = transition(c, {
    type: "devReview",
    scopeReqIds: ["REQ-REF-001"],
    outcome: "Accepted",
    reviewer: "Dev lead",
    basis: "basis",
  });
  c = transition(c, {
    type: "snapshot",
    audience: "CRD",
    scopeReqIds: ["REQ-REF-001"],
  });
  c = transition(c, {
    type: "snapshot",
    audience: "DRD",
    scopeReqIds: ["REQ-REF-001"],
  });
  return c;
}

for (const stage of stageOrder)
  test(`resetDemo(${stage}) is idempotent across repeated resets when confirmation/devReview/snapshots already exist`, () => {
    const c = withConfirmedAndSnapshots();
    const once = resetDemo(c, stage);
    const twice = resetDemo(once, stage);
    const thrice = resetDemo(twice, stage);
    assert.deepEqual(once.confirmation, twice.confirmation);
    assert.deepEqual(twice.confirmation, thrice.confirmation);
    assert.deepEqual(once.devReview, twice.devReview);
    assert.deepEqual(twice.devReview, thrice.devReview);
    assert.deepEqual(once.snapshots, twice.snapshots);
    assert.deepEqual(twice.snapshots, thrice.snapshots);
  });

test("Reset from 'readiness' or 'handoff' never resurrects a deleted DRD snapshot or drops the CRD snapshot made at customer stage", () => {
  const c = withConfirmedAndSnapshots();
  for (const stage of ["readiness", "handoff"] as const) {
    const reset = resetDemo(c, stage);
    assert.equal(
      reset.snapshots.filter((s) => s.audience === "DRD").length,
      0,
      `DRD snapshot should be cleared on reset(${stage})`,
    );
    assert.equal(
      reset.snapshots.filter((s) => s.audience === "CRD").length,
      1,
      `CRD snapshot from Customer stage should survive reset(${stage})`,
    );
    assert.equal(reset.confirmation.outcome, "Confirmed");
    const again = resetDemo(reset, stage);
    assert.deepEqual(reset.snapshots, again.snapshots);
  }
});
