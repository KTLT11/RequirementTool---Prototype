import type { ReactNode } from "react";

export type SuggestionStatus = "Awaiting BA Review" | "Accepted" | "Rejected";

/**
 * Visual convention for genuinely system-generated/simulated content only
 * (e.g. a suggested Discovery hypothesis). Never apply to confirmed evidence,
 * confirmation records, snapshots, or structured CRD/DRD content.
 */
export function SuggestionTag({
  label = "Hệ thống gợi ý",
  reason,
  status,
  children,
}: {
  label?: string;
  reason?: string;
  status?: SuggestionStatus;
  children: ReactNode;
}) {
  return (
    <div className="suggested-content">
      <div className="suggested-content-head">
        <span className="suggested-content-label">{label}</span>
        {status && (
          <span className={`suggested-content-status status-${status.replace(/\s+/g, "-").toLowerCase()}`}>
            {{ 'Awaiting BA Review': 'Chờ BA quyết định', Accepted: 'BA đã áp dụng', Rejected: 'BA không sử dụng' }[status]}
          </span>
        )}
      </div>
      {children}
      {reason && <p className="suggested-content-reason">{reason}</p>}
    </div>
  );
}
