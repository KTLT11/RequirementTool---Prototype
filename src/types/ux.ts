import type { Stage } from "./case";
export interface SourceDocument {
  id: string;
  name: string;
  type: string;
  source: string;
  sourceId: string;
  status: "Demo sample" | "Text loaded" | "Metadata only";
  text: string;
  uploadedAt: string;
}
export interface ExtractedItem {
  id: string;
  documentId: string;
  reference: string;
  excerpt: string;
  value: string;
  interpretation: string;
  questionId: string;
  status: "Pending Review" | "Accepted" | "Rejected";
  evidenceId: string | null;
}
export interface UXState {
  documents: SourceDocument[];
  extracted: ExtractedItem[];
  drafts: Record<string, { text: string; source: string }>;
  correction: boolean;
  customerPreview: boolean;
  devPreview: boolean;
  simulationVersion: number | null;
  replayFrom: Stage | null;
}
export type UXCommand =
  | { op: "document"; document: SourceDocument }
  | {
      op: "extracted";
      id: string;
      status: ExtractedItem["status"];
      interpretation: string;
    }
  | { op: "link"; id: string; questionId: string }
  | { op: "draft"; questionId: string; text: string; source: string }
  | { op: "save"; questionId: string }
  | { op: "correction" | "customer" | "dev"; value: boolean }
  | { op: "deleteDocument"; id: string };
