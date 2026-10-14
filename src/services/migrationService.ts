import type { WorkCase } from "../types/case";
export function defaultConfirmation(): WorkCase["confirmation"] {
  return {
    scopeReqIds: [],
    outcome: "Pending",
    approverRole: "",
    approverIdentity: "",
    basis: "",
    date: null,
    snapshotId: null,
    comments: "",
    changeRequests: "",
  };
}
export function defaultDevReview(): WorkCase["devReview"] {
  return {
    scopeReqIds: [],
    outcome: "Pending",
    reviewer: "",
    basis: "",
    date: null,
    snapshotId: null,
    blockers: "",
  };
}
export function backfillCase(c: WorkCase): WorkCase {
  return {
    ...c,
    confirmation: c.confirmation ?? defaultConfirmation(),
    devReview: c.devReview ?? defaultDevReview(),
    snapshots: c.snapshots ?? [],
  };
}
