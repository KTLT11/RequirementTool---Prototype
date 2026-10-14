import type { UXState } from "./ux";
export type CaseStatus =
  | "In Progress"
  | "Re-review Required"
  | "Preparation Accepted — Blocked"
  | "Requirement Preparation Completed";
export type Stage =
  | "incoming"
  | "context"
  | "discovery"
  | "formation"
  | "customer"
  | "readiness"
  | "handoff";
export type Provenance =
  | "Incoming Request"
  | "Demo Scenario"
  | "Assumption"
  | "Simulated Suggestion"
  | "BA-entered Information";
export type Module =
  "Core" | "Process" | "Business Rule" | "Integration" | "Exception";
export type CheckStatus = "Pass" | "Fail" | "Unknown" | "N/A";
export interface ContextItem {
  id: string;
  label: string;
  text: string;
  certainty: "Known" | "Unknown" | "Assumption";
  provenance: Provenance;
  owner: string;
  nextAction: string;
}
export interface ContextAnalysis {
  items: ContextItem[];
  reviewed: boolean;
  complexity: [string, string, string];
  complexityReason: string;
  complexityProvenance: Provenance;
  hypothesis: string;
  hypothesisProvenance: Provenance;
  suggestionStatus: "Not generated" | "Suggested" | "Accepted" | "Rejected";
  reassessmentRequired: boolean;
}
export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  authority: string;
  modules: Module[];
  provenance: Provenance;
}
export interface Question {
  id: string;
  infoId: string;
  module: Module;
  question: string;
  why: string;
  checkId: string;
  mandatory: boolean;
}
export interface Response {
  questionId: string;
  text: string;
  source: string;
  provenance: Provenance;
  evidenceId: string | null;
}
export interface Evidence {
  documentId?: string;
  extractedId?: string;
  id: string;
  questionId: string;
  statement: string;
  sourceId: string;
  provenance: Provenance;
  review: "Pending Review" | "Reviewed" | "Needs Clarification";
  status: "Unconfirmed" | "Confirmed" | "Assumption" | "Superseded";
  version: number;
  reviewedBy: string;
  basis: string;
  authorityId: string;
}
export interface Resolution {
  authorityId: string;
  evidenceId: string;
  basis: string;
  sourceVersions: string[];
}
export interface Gap {
  id: string;
  questionId: string;
  infoId: string;
  module: Module;
  checkId: string;
  type: "Missing" | "Unknown" | "Conflict";
  description: string;
  evidenceIds: string[];
  status: "Open" | "In Clarification" | "Resolved";
  clarifications: { id: string; text: string; owner: string; date: string }[];
  resolution: Resolution | null;
}
export interface Discovery {
  responses: Response[];
  evidence: Evidence[];
  gaps: Gap[];
  stakeholders: Stakeholder[];
  patterns: {
    module: Module;
    status: "Suggested" | "Validated" | "Rejected";
  }[];
  checkpointRun: boolean;
}
export interface PreviewState {
  status: "Baseline" | "Viewed" | "Stale";
  sourceVersion: number;
}
export type ConfirmationOutcome =
  | "Pending"
  | "Confirmed"
  | "Partially Confirmed"
  | "Changes Requested";
export interface ConfirmationRecord {
  scopeReqIds: string[];
  outcome: ConfirmationOutcome;
  approverRole: string;
  approverIdentity: string;
  basis: string;
  date: string | null;
  snapshotId: string | null;
  comments: string;
  changeRequests: string;
}
export type DevReviewOutcome =
  | "Pending"
  | "Accepted"
  | "Accepted with Blocker"
  | "Changes Requested";
export interface DevReviewRecord {
  scopeReqIds: string[];
  outcome: DevReviewOutcome;
  reviewer: string;
  basis: string;
  date: string | null;
  snapshotId: string | null;
  blockers: string;
}
export interface DocumentSection {
  code: string;
  title: string;
  body: string;
  applies: boolean;
}
export interface DocumentSnapshot {
  id: string;
  audience: "CRD" | "DRD";
  version: number;
  scopeReqIds: string[];
  sections: DocumentSection[];
  createdAt: string;
}
export interface Activity {
  id: string;
  date: string;
  stage: Stage;
  action: string;
}
export interface WorkCase {
  layer2?: import("./requirement").Layer2State;
  ux?: UXState;
  id: string;
  name: string;
  summary: string;
  incomingRequest: string;
  status: CaseStatus;
  businessContext: string | null;
  businessSource: string | null;
  isDemo: boolean;
  currentStage: Stage;
  version: number;
  context: ContextAnalysis;
  discovery: Discovery;
  previews: Record<
    "formation" | "customer" | "readiness" | "handoff",
    PreviewState
  >;
  confirmation: ConfirmationRecord;
  devReview: DevReviewRecord;
  snapshots: DocumentSnapshot[];
  history: Activity[];
}
export type LoadStatus = "loading" | "ready" | "error";
