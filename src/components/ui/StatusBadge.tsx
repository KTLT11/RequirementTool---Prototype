import type { ReactNode } from "react";

type Tone = "neutral" | "sage" | "terracotta" | "warning" | "error";

/**
 * Semantic status -> visual tone mapping, grouped by the business dimension
 * the status belongs to. Keeping this centralized means a status always
 * renders the same way everywhere, and the four groups (Evidence Review,
 * Evidence Confidence, Quality, Dev Readiness) never bleed into each other.
 */
const CATEGORY_MAP = {
  "evidence-review": {
    label: "Review",
    tones: {
      "Pending Review": "neutral",
      Reviewed: "sage",
      "Needs Clarification": "warning",
    },
  },
  "evidence-confidence": {
    label: "Confidence",
    tones: {
      Unconfirmed: "neutral",
      Confirmed: "sage",
      Assumption: "terracotta",
      Superseded: "error",
    },
  },
  quality: {
    label: "Quality",
    tones: {
      Pass: "sage",
      Fail: "error",
      Unknown: "neutral",
      "N/A": "neutral",
      Stale: "warning",
    },
  },
  "dev-readiness": {
    label: "Dev Readiness",
    tones: {
      Ready: "sage",
      "Ready but Blocked": "warning",
      "Not Ready": "error",
    },
  },
  confirmation: {
    label: "Customer Confirmation",
    tones: {
      Pending: "neutral",
      Confirmed: "sage",
      "Partially Confirmed": "sage",
      "Changes Requested": "warning",
    },
  },
} as const;

export type StatusCategory = keyof typeof CATEGORY_MAP;
export type CategoryStatus<C extends StatusCategory> =
  keyof (typeof CATEGORY_MAP)[C]["tones"];

function toneFor<C extends StatusCategory>(
  category: C,
  status: CategoryStatus<C>,
): Tone {
  const tones = CATEGORY_MAP[category].tones as Record<string, Tone>;
  return tones[status as string] ?? "neutral";
}

/**
 * A single status badge whose color is derived from its business category
 * and status, not chosen ad hoc at the call site. Pass `showCategory` to
 * prefix a small category label — use this wherever two dimensions (e.g.
 * Review + Confidence) are shown together so they can't be confused.
 */
export function StatusBadge<C extends StatusCategory>({
  category,
  status,
  showCategory = false,
  suffix,
}: {
  category: C;
  status: CategoryStatus<C>;
  showCategory?: boolean;
  suffix?: ReactNode;
}) {
  const tone = toneFor(category, status);
  const label = CATEGORY_MAP[category].label;
  return (
    <span
      className={`badge badge-${tone}`}
      aria-label={`${label}: ${String(status)}`}
    >
      <span className="badge-dot" aria-hidden="true" />
      {showCategory && (
        <span className="badge-category" aria-hidden="true">
          {label}
        </span>
      )}
      {String(status)}
      {suffix}
    </span>
  );
}

/** Lays out a set of StatusBadges on a shared right-aligned column. */
export function StatusColumn({ children }: { children: ReactNode }) {
  return <div className="status-column">{children}</div>;
}
