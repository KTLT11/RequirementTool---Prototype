import type { CaseStatus } from "../../types/case";
import { Badge } from "../ui/primitives";
const statusTones = {
  "In Progress": "terracotta",
  "Re-review Required": "warning",
  "Preparation Accepted — Blocked": "warning",
  "Requirement Preparation Completed": "sage",
} as const;
export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return <Badge tone={statusTones[status]}>{status}</Badge>;
}
