import { initialLayer2 } from "./requirementService";
import { ux, initialUX, sceneForStage } from "./uxService";
import test from "node:test";
import { sampleSpec } from "./previewService";
import assert from "node:assert/strict";
import { createDemoBaseline, stageOrder } from "../data/cases";
import { transition, createCase } from "./caseTransitions";
import {
  reconcileGaps,
  discoveryChecks,
  contextReady,
} from "./discoveryService";
import { resetDemo } from "./demoResetService";
import type { WorkCase } from "../types/case";
function baseline() {
  const c = createDemoBaseline();
  c.discovery.gaps = reconcileGaps(c);
  return c;
}
function changed() {
  let c = baseline();
  c = transition(c, {
    type: "edit",
    name: "Refund review modified",
    request: c.incomingRequest + " Bổ sung yêu cầu theo dõi.",
  });
  const context = structuredClone(c.context);
  context.items[3].text = "Upstream scope must be preserved";
  c = transition(c, { type: "context", context });
  c = transition(c, { type: "suggestion", outcome: "Accepted" });
  c = transition(c, { type: "contextReview" });
  c = transition(c, {
    type: "response",
    questionId: "INT-Q-07",
    text: "requestId, transactionId, refundAmount (VND)",
    sourceId: "ST-INT",
  });
  const e = c.discovery.responses.find(
    (r) => r.questionId === "INT-Q-07",
  )!.evidenceId!;
  c = transition(c, { type: "review", evidenceId: e, review: "Reviewed" });
  c = transition(c, {
    type: "confirm",
    evidenceId: e,
    authorityId: "ST-INT",
    basis: "Biên bản giả lập xác nhận payload.",
  });
  c = transition(c, {
    type: "review",
    evidenceId: "EVI-30",
    review: "Reviewed",
  });
  c = transition(c, {
    type: "confirm",
    evidenceId: "EVI-30",
    authorityId: "ST-POL",
    basis: "Policy Owner xác nhận 30 ngày trong kịch bản.",
  });
  c = transition(c, {
    type: "resolve",
    gapId: "GAP-RULE-Q-06",
    evidenceId: "EVI-30",
    authorityId: "ST-POL",
    basis: "Quyết định kịch bản chọn 30 ngày; giữ cả hai nguồn.",
  });
  for (const stage of [
    "formation",
    "customer",
    "readiness",
    "handoff",
  ] as const)
    c = transition(c, { type: "viewPreview", stage });
  return c;
}
test("Creation validates input and creates independent Case", () => {
  assert.throws(() => createCase("", "request"));
  const c = createCase("New case", "Yêu cầu mới");
  assert.equal(c.status, "In Progress");
  assert.equal(c.isDemo, false);
  assert.equal(c.discovery.evidence.length, 0);
  assert.equal(c.discovery.gaps.length, 8);
  assert.notEqual(c.id, baseline().id);
});
test("Initial scenario has Pending Review, Reviewed/Unconfirmed, conflict and missing inputs", () => {
  const c = baseline();
  assert(c.discovery.evidence.some((e) => e.review === "Pending Review"));
  assert(
    c.discovery.evidence.some(
      (e) => e.review === "Reviewed" && e.status === "Unconfirmed",
    ),
  );
  assert(
    c.discovery.gaps.some((g) => g.type === "Conflict" && g.status === "Open"),
  );
  assert(c.discovery.gaps.some((g) => g.type === "Missing"));
  assert(discoveryChecks(c).some((check) => check.status === "Fail"));
  assert.equal(contextReady(c), false);
});
test("Reviewed does not imply Confirmed; clarification text alone cannot resolve", () => {
  let c = baseline();
  c = transition(c, {
    type: "review",
    evidenceId: "EVI-30",
    review: "Reviewed",
  });
  assert.equal(
    c.discovery.evidence.find((e) => e.id === "EVI-30")!.status,
    "Unconfirmed",
  );
  c = transition(c, {
    type: "clarify",
    gapId: "GAP-RULE-Q-06",
    text: "Chọn 30 ngày",
    owner: "ST-POL",
  });
  assert.equal(
    c.discovery.gaps.find((g) => g.id === "GAP-RULE-Q-06")!.status,
    "In Clarification",
  );
  assert.throws(() =>
    transition(c, {
      type: "resolve",
      gapId: "GAP-RULE-Q-06",
      evidenceId: "EVI-30",
      authorityId: "ST-POL",
      basis: "Chọn 30 ngày",
    }),
  );
});
test("Wrong authority cannot confirm; correct conflict decision keeps both sources", () => {
  const c = baseline();
  assert.throws(() =>
    transition(c, {
      type: "confirm",
      evidenceId: "EVI-14",
      authorityId: "ST-CS",
      basis: "CS đồng ý",
    }),
  );
  const result = changed();
  const gap = result.discovery.gaps.find((g) => g.id === "GAP-RULE-Q-06")!;
  assert.equal(gap.status, "Resolved");
  assert.equal(gap.resolution!.sourceVersions.length, 2);
  assert(result.discovery.evidence.find((e) => e.id === "EVI-14"));
  assert(result.discovery.evidence.find((e) => e.id === "EVI-30"));
  assert.equal(result.status, "In Progress");
});
test("Source response change supersedes evidence, reopens gap and invalidates downstream", () => {
  const c = changed();
  const output = transition(c, {
    type: "response",
    questionId: "RULE-Q-06",
    text: "Hoàn tiền trong 31 ngày.",
    sourceId: "ST-POL",
  });
  assert.notEqual(
    output.discovery.gaps.find((g) => g.id === "GAP-RULE-Q-06")!.status,
    "Resolved",
  );
  assert.equal(output.previews.customer.status, "Stale");
  assert.equal(output.context.reassessmentRequired, true);
  assert.equal(
    output.discovery.evidence.find((e) => e.id === "EVI-30")!.status,
    "Superseded",
  );
  assert.equal(
    c.discovery.evidence.find((e) => e.id === "EVI-30")!.status,
    "Confirmed",
  );
});
for (const stage of stageOrder)
  test(`Dependency reset from ${stage} preserves all upstream segments`, () => {
    const c = changed();
    const before = JSON.stringify(c);
    const r = resetDemo(c, stage);
    const index = stageOrder.indexOf(stage);
    const base = baseline();
    assert.equal(r.currentStage, stage);
    assert.equal(JSON.stringify(c), before);
    assert.equal(r.id, c.id);
    if (index > 0) {
      assert.equal(r.name, c.name);
      assert.equal(r.incomingRequest, c.incomingRequest);
    } else {
      assert.equal(r.name, base.name);
      assert.equal(r.incomingRequest, base.incomingRequest);
    }
    assert.deepEqual(r.context, index <= 1 ? base.context : c.context);
    assert.deepEqual(r.discovery, index <= 2 ? base.discovery : c.discovery);
    for (const key of [
      "formation",
      "customer",
      "readiness",
      "handoff",
    ] as const) {
      if (stageOrder.indexOf(key) < index)
        assert.deepEqual(r.previews[key], c.previews[key]);
      else
        assert.equal(
          r.previews[key].status,
          index === 0 || stage === key ? "Baseline" : "Stale",
        );
    }
    assert.equal(r.status, "In Progress");
  });
test("Entire Demo reset restores conflict, missing responses and stable IDs", () => {
  const r = resetDemo(changed(), "incoming");
  assert.equal(
    r.discovery.responses.find((r) => r.questionId === "INT-Q-07")!.text,
    "",
  );
  assert.equal(
    r.discovery.gaps.find((g) => g.id === "GAP-RULE-Q-06")!.status,
    "Open",
  );
  assert.equal(r.discovery.evidence.length, 6);
  assert.equal(r.context.reviewed, false);
  assert.equal(r.currentStage, baseline().currentStage);
});
test("Reset repeats deterministically for business data and is scoped to demo", () => {
  const first = resetDemo(changed(), "discovery");
  const second = resetDemo(first, "discovery");
  assert.deepEqual(first.discovery, second.discovery);
  assert.deepEqual(first.context, second.context);
  assert.throws(() =>
    resetDemo(createCase("Other", "Other request"), "incoming"),
  );
});
test("Reset after response edit and conflict resolution preserves context from Layer 1", () => {
  const c = changed();
  assert.equal(
    c.discovery.gaps.find((g) => g.id === "GAP-RULE-Q-06")!.status,
    "Resolved",
  );
  const reset = resetDemo(c, "discovery");
  assert.deepEqual(reset.context, c.context);
  assert.equal(
    reset.discovery.gaps.find((g) => g.id === "GAP-RULE-Q-06")!.status,
    "Open",
  );
  assert.equal(
    reset.discovery.responses.find((r) => r.questionId === "INT-Q-07")!.text,
    "",
  );
});
test("Serialized reset survives refresh round-trip with matching versions and gaps", () => {
  const reset = resetDemo(changed(), "customer");
  const saved = JSON.parse(JSON.stringify({ schema: 1, cases: [reset] })) as {
    schema: number;
    cases: WorkCase[];
  };
  assert.deepEqual(saved.cases[0], reset);
  assert.equal(saved.cases[0].previews.customer.status, "Baseline");
  assert.equal(saved.cases[0].previews.readiness.status, "Stale");
  assert.deepEqual(saved.cases[0].discovery, reset.discovery);
});
test("Mandatory gates cannot be bypassed by advancing or viewing previews", () => {
  const c = baseline();
  assert.throws(() => transition(c, { type: "advance", stage: "discovery" }));
  assert.throws(() => transition(c, { type: "advance", stage: "formation" }));
  assert.throws(() => transition(c, { type: "advance", stage: "handoff" }));
  const viewed = transition(c, { type: "viewPreview", stage: "customer" });
  assert.equal(viewed.currentStage, c.currentStage);
  assert.equal(viewed.status, c.status);
});
test("Unverified important context assumption blocks Information Complete even after question gaps close", () => {
  const c = baseline();
  c.discovery.gaps = c.discovery.gaps.map((g) => ({
    ...g,
    status: "Resolved",
  }));
  assert.equal(
    discoveryChecks(c).find((check) => check.id === "DISC-CHK-08")!.status,
    "Unknown",
  );
});
test("Layer 1 reset retains stakeholders referenced by preserved context", () => {
  let c = changed();
  c = transition(c, {
    type: "stakeholder",
    name: "Context source",
    role: "Process owner",
    authority: "Context assessment",
    modules: ["Core"],
  });
  const owner = c.discovery.stakeholders.at(-1)!;
  const ctx = structuredClone(c.context);
  ctx.items[0].owner = owner.id;
  c = transition(c, { type: "context", context: ctx });
  const reset = resetDemo(c, "discovery");
  assert(reset.discovery.stakeholders.some((s) => s.id === owner.id));
  assert.deepEqual(reset.context, c.context);
});
test("Conflict text follows changed source values rather than retaining original 14/30 wording", () => {
  const c = transition(changed(), {
    type: "response",
    questionId: "RULE-Q-06",
    text: "31 ngày",
    sourceId: "ST-POL",
  });
  assert.match(
    c.discovery.gaps.find((g) => g.questionId === "RULE-Q-06")!.description,
    /14 \/ 31/,
  );
});
test("Late simulated suggestion is rejected after reset and viewing preview does not change source version", () => {
  const c = changed();
  const reset = resetDemo(c, "context");
  assert.throws(() =>
    transition(reset, {
      type: "suggestion",
      outcome: "Suggested",
      hypothesis: "Old result",
      inputVersion: c.version,
    }),
  );
  const viewed = transition(c, { type: "viewPreview", stage: "handoff" });
  assert.equal(viewed.version, c.version);
  assert.equal(viewed.previews.handoff.sourceVersion, c.version);
});

test("Preview uses current unresolved rule source", () => {
  const c = transition(changed(), {
    type: "response",
    questionId: "RULE-Q-06",
    text: "31 ngày",
    sourceId: "ST-POL",
  });
  assert.match(sampleSpec(c).rule, /14 \/ 31/);
});

test("UX V2 drafts survive saving another question and serialization", () => {
  let c = baseline();
  for (const id of ["CORE-Q-01", "CORE-Q-02"])
    c = transition(c, {
      type: "ux",
      command: {
        op: "draft",
        questionId: id,
        text: `Draft ${id}`,
        source: "ST-OPS",
      },
    });
  const version = c.version;
  c = transition(c, {
    type: "ux",
    command: { op: "save", questionId: "CORE-Q-01" },
  });
  assert.equal(ux(c).drafts["CORE-Q-02"].text, "Draft CORE-Q-02");
  assert.equal(c.version, version + 1);
  assert.equal(
    ux(JSON.parse(JSON.stringify(c))).drafts["CORE-Q-02"].text,
    "Draft CORE-Q-02",
  );
});
test("UX V2 accepting interpretation cannot confirm; link preserves opposite source", () => {
  let c = transition(baseline(), {
    type: "ux",
    command: {
      op: "extracted",
      id: "EXT-2",
      status: "Accepted",
      interpretation: "30 ngày sau thanh toán",
    },
  });
  assert(!ux(c).extracted[1].evidenceId);
  c = transition(c, {
    type: "ux",
    command: { op: "link", id: "EXT-2", questionId: "RULE-Q-06" },
  });
  const e = c.discovery.evidence.find(
    (e) => e.id === ux(c).extracted[1].evidenceId,
  )!;
  assert.equal(e.status, "Unconfirmed");
  assert.equal(e.review, "Pending Review");
  assert.equal(e.documentId, "DOC-POL");
  assert.equal(
    c.discovery.evidence.find((e) => e.id === "EVI-14")!.status,
    "Unconfirmed",
  );
  assert.equal(
    c.discovery.evidence.find((e) => e.id === "EVI-30")!.status,
    "Superseded",
  );
  assert.equal(
    c.discovery.gaps.find((g) => g.questionId === "RULE-Q-06")!.type,
    "Conflict",
  );
  c = transition(c, {
    type: "ux",
    command: {
      op: "extracted",
      id: "EXT-2",
      status: "Accepted",
      interpretation: "31 ngày",
    },
  });
  assert.equal(
    c.discovery.evidence.find((x) => x.id === e.id)!.status,
    "Superseded",
  );
  assert.equal(ux(c).extracted[1].evidenceId, null);
});
test("UX V2 deleting a document removes its unlinked extraction but is blocked once an extraction has an Evidence link", () => {
  let c = baseline();
  assert.equal(ux(c).documents.length, 2);
  assert.equal(ux(c).extracted.filter((i) => i.documentId === "DOC-CS").length, 1);
  c = transition(c, {
    type: "ux",
    command: { op: "deleteDocument", id: "DOC-CS" },
  });
  assert(!ux(c).documents.some((d) => d.id === "DOC-CS"));
  assert(!ux(c).extracted.some((i) => i.documentId === "DOC-CS"));
  assert.equal(ux(c).documents.length, 1);

  c = transition(c, {
    type: "ux",
    command: {
      op: "extracted",
      id: "EXT-2",
      status: "Accepted",
      interpretation: "30 ngày sau thanh toán",
    },
  });
  c = transition(c, {
    type: "ux",
    command: { op: "link", id: "EXT-2", questionId: "RULE-Q-06" },
  });
  assert.throws(
    () =>
      transition(c, {
        type: "ux",
        command: { op: "deleteDocument", id: "DOC-POL" },
      }),
    /Evidence/,
  );
  assert(ux(c).documents.some((d) => d.id === "DOC-POL"));
});
test("UX V2 document metadata import does not invent extraction", () => {
  let c = baseline();
  const before = ux(c).extracted.length;
  c = transition(c, {
    type: "ux",
    command: {
      op: "document",
      document: {
        id: "DOC-UPLOAD",
        name: "customer.pdf",
        type: "PDF",
        source: "BA upload",
        sourceId: "",
        status: "Metadata only",
        text: "",
        uploadedAt: "2026-10-12T00:00:00Z",
      },
    },
  });
  assert.equal(ux(c).extracted.length, before);
  assert.equal(ux(c).documents.at(-1)!.status, "Metadata only");
});
test("Stage 4 preview stays separate from real Layer 2 and cannot run retired correction", () => {
  let c = baseline();
  c.layer2 = initialLayer2(true);
  assert.throws(
    () =>
      transition(c, { type: "ux", command: { op: "correction", value: true } }),
    /editor/,
  );
  c = transition(c, {
    type: "layer2",
    command: { op: "validate", ids: ["REQ-REF-002"] },
  });
  const stage = c.currentStage,
    version = c.version,
    results = structuredClone(c.layer2!.results);
  c = transition(c, { type: "ux", command: { op: "customer", value: true } });
  assert.equal(c.currentStage, stage);
  assert.equal(c.version, version);
  assert.deepEqual(c.layer2!.results, results);
  assert(ux(c).customerPreview);
  const reset = resetDemo(c, "readiness");
  assert(ux(reset).customerPreview);
  assert.deepEqual(reset.layer2, c.layer2);
  const whole = resetDemo(c, "incoming");
  assert.deepEqual(ux(whole).documents, initialUX(true).documents);
  assert(!ux(whole).customerPreview);
});
test("UX V2 Discovery reset preserves source review but clears downstream evidence links/drafts", () => {
  let c = baseline();
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
  const reset = resetDemo(c, "discovery");
  assert.deepEqual(ux(reset).documents, ux(c).documents);
  assert.equal(ux(reset).extracted[1].status, "Accepted");
  assert.equal(ux(reset).extracted[1].evidenceId, null);
  assert.equal(reset.currentStage, "discovery");
});

test("Guided Demo resumes at the scene owned by selected reset stage", () => {
  assert.equal(
    sceneForStage(resetDemo(baseline(), "discovery").ux!.replayFrom),
    3,
  );
  assert.equal(
    sceneForStage(resetDemo(baseline(), "handoff").ux!.replayFrom),
    11,
  );
  assert.equal(
    sceneForStage(resetDemo(baseline(), "incoming").ux!.replayFrom),
    0,
  );
});
