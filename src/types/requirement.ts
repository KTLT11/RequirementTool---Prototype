import type { CheckStatus } from "../types/case";
export type RequirementModule =
  | "Process"
  | "Business Rule"
  | "Integration"
  | "Data/Entity"
  | "Permission"
  | "Exception"
  | "NFR";
export type RequirementField =
  | "need"
  | "actor"
  | "trigger"
  | "behavior"
  | "rule"
  | "data"
  | "exception"
  | "constraint"
  | "dependency"
  | "integration"
  | "permission"
  | "target"
  | "measurement";
export interface AcceptanceCriterion {
  id: string;
  title: string;
  format: "Condition/Outcome" | "Given/When/Then";
  condition: string;
  input: string;
  outcome: string;
  verification: string;
  scenarioIds: string[];
  evidenceIds: string[];
  status: "Draft" | "Reviewed";
}
export interface BAQualityReview {
  status: "Pass" | "Fail";
  reviewer: string;
  basis: string;
  fingerprint: string;
}
export interface Requirement {
  id: string;
  title: string;
  module: RequirementModule;
  statement: string;
  fields: Record<RequirementField, string>;
  status: "Draft" | "Reviewed" | "Archived";
  revision: number;
  questionIds: string[];
  evidenceIds: string[];
  relatedIds: string[];
  scenarios: { id: string; title: string }[];
  applicabilityBasis: string;
  coverageApplicability?: "Applicable" | "Unknown" | "N/A";
  ac: AcceptanceCriterion[];
  reviews: Record<string, BAQualityReview>;
  origin: "Demo Scenario" | "BA-entered" | "Discovery template";
  parentId?: string;
}
export interface CheckResult {
  id: string;
  checkId: string;
  requirementId: string;
  status: CheckStatus;
  freshness: "Current" | "Stale";
  staleReasons: string[];
  fingerprint: string;
  ruleVersion: string;
  inputVersion: number;
  explanation: string;
  action: string;
  method: "Structured" | "BA review";
  severity: "High" | "Medium";
  entityIds: string[];
}
export interface ValidationRun {
  id: string;
  date: string;
  scope: string[];
  inputVersion: number;
  ruleVersion: string;
  status: "Completed";
  results: CheckResult[];
}
export interface Layer2State {
  requirements: Requirement[];
  drafts: Record<string, Requirement>;
  results: CheckResult[];
  runs: ValidationRun[];
}
export type Layer2Command =
  | {
      op: "create";
      title: string;
      module: RequirementModule;
      questionIds?: string[];
      evidenceIds?: string[];
      parentId?: string;
    }
  | { op: "draft"; requirement: Requirement }
  | { op: "discard"; id: string }
  | { op: "save"; requirement: Requirement }
  | { op: "archive"; id: string }
  | {
      op: "split";
      id: string;
      children: {
        title: string;
        statement: string;
        acIds: string[];
        evidenceIds: string[];
      }[];
    }
  | {
      op: "review";
      id: string;
      checkId: string;
      status: "Pass" | "Fail";
      reviewer: string;
      basis: string;
    }
  | { op: "validate"; ids: string[] };
