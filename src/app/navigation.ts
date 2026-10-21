import {
  LayoutDashboard,
  Compass,
  Library,
  ListChecks,
  ShieldCheck,
  FileCheck2,
  History,
  FileInput,
  ScanSearch,
  PackageCheck,
} from "lucide-react";
export const workspaceSections = [
  {
    slug: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    title: "Overview",
    phase: 2,
  },
  {
    slug: "sources",
    label: "Request & Sources",
    icon: FileInput,
    title: "Request & Sources",
    phase: 2,
  },
  {
    slug: "context",
    label: "Context Analysis",
    icon: ScanSearch,
    title: "Context Analysis",
    phase: 2,
  },
  {
    slug: "discovery",
    label: "Discovery",
    icon: Compass,
    title: "Discovery Workbench",
    phase: 2,
  },
  {
    slug: "evidence",
    label: "Evidence & Gaps",
    icon: Library,
    title: "Evidence & Gaps",
    phase: 2,
  },
  {
    slug: "requirements",
    label: "Requirements",
    icon: ListChecks,
    title: "Requirements",
    phase: 3,
  },
  {
    slug: "quality",
    label: "Quality Review",
    icon: ShieldCheck,
    title: "Quality Review",
    phase: 3,
  },
  {
    slug: "customer",
    label: "Customer Confirmation",
    icon: FileCheck2,
    title: "Customer Confirmation",
    phase: 4,
  },
  {
    slug: "handoff",
    label: "Dev Readiness & Handoff",
    icon: PackageCheck,
    title: "Dev Readiness & Handoff",
    phase: 4,
  },
  {
    slug: "history",
    label: "History",
    icon: History,
    title: "Case History",
    phase: 2,
  },
] as const;
export type SectionSlug =
  (typeof workspaceSections)[number]["slug"] | "continue" | "explore" | "data";
export const casePath = (id: string, section: SectionSlug = "continue") =>
  `/cases/${encodeURIComponent(id)}/${section}`;
