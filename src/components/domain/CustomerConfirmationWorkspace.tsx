import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { WorkCase, ConfirmationOutcome } from "../../types/case";
import { casePath } from "../../app/navigation";
import { useApp } from "../../context/AppContext";
import {
  layer2,
  requirementQuality,
  qualitySummary,
} from "../../services/requirementService";
import { defaultDocumentScope } from "../../services/documentService";
import {
  Button,
  Badge,
  Select,
  Textarea,
  TextInput,
} from "../ui/primitives";
import { StatusBadge } from "../ui/StatusBadge";

function qualityTone(status: ReturnType<typeof requirementQuality>) {
  if (status === "Quality Ready") return "sage";
  if (status === "Fail") return "terracotta";
  if (status === "Stale") return "warning";
  return "neutral";
}

function scopeOpenGaps(c: WorkCase, scopeReqIds: string[]) {
  const requirements = layer2(c).requirements.filter((r) =>
    scopeReqIds.includes(r.id),
  );
  return c.discovery.gaps.filter(
    (g) =>
      g.status !== "Resolved" &&
      requirements.some((r) => r.questionIds.includes(g.questionId)),
  );
}

/**
 * Customer Review & Confirmation workspace: a sequential, guided flow
 * (scope → review package → outstanding issues → stakeholder → decision →
 * record) replacing the previous flat checkbox-and-fields form. All business
 * rules/validation are unchanged — delegated to the `confirmCustomer`
 * command in caseTransitions.ts.
 */
export function CustomerReviewWorkspace({ workCase: c }: { workCase: WorkCase }) {
  const [taskParams] = useSearchParams();
  const { update } = useApp();
  const active = layer2(c).requirements.filter((r) => r.status !== "Archived");
  const [scope, setScope] = useState<string[]>(
    taskParams.get("scope")
      ? defaultDocumentScope(c).filter((id) => id === taskParams.get("scope"))
      : c.confirmation.scopeReqIds.length
        ? c.confirmation.scopeReqIds
        : defaultDocumentScope(c),
  );
  const [outcome, setOutcome] = useState<ConfirmationOutcome>("Confirmed");
  const [approverRole, setApproverRole] = useState(c.confirmation.approverRole);
  const [approverIdentity, setApproverIdentity] = useState(
    c.confirmation.approverIdentity,
  );
  const [basis, setBasis] = useState("");
  const [comments, setComments] = useState("");
  const [changeRequests, setChangeRequests] = useState("");
  const [error, setError] = useState("");
  const toggle = (id: string) =>
    setScope((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const notExecuted = scope.filter(
    (id) => requirementQuality(c, id) === "Not Executed",
  );
  const notReady = scope.filter(
    (id) => requirementQuality(c, id) !== "Quality Ready",
  );
  const openGaps = scopeOpenGaps(c, scope);
  const outstanding = notReady.length > 0 || openGaps.length > 0;
  const blockedByNotExecuted = notExecuted.length > 0;

  return (
    <div className="confirmation-workspace">
      <details className="disclosure confirmation-helper">
        <summary>Phân biệt các lớp review</summary>
        <ul>
          <li>Evidence: xác minh nguồn và căn cứ.</li>
          <li>Requirement: review nội dung và AC (BA Review).</li>
          <li>
            Customer: xác nhận scope/baseline đã gửi (Customer Confirmation).
          </li>
          <li>
            Dev: tiếp nhận package cùng scope/baseline (Dev
            Review/Acceptance).
          </li>
        </ul>
        <p className="small muted">
          BA Review ≠ Customer Confirmation ≠ Quality Ready ≠ Dev Acceptance.
        </p>
      </details>

      <section className="confirmation-section">
        <span className="confirmation-section-eyebrow">Confirmation Scope</span>
        <h3>Chọn Requirement đưa vào review này</h3>
        <p className="small muted">
          Hiện tại: <strong>{c.confirmation.outcome}</strong>
          {c.confirmation.scopeReqIds.length
            ? ` · scope ${c.confirmation.scopeReqIds.join(", ")}`
            : ""}
          {c.confirmation.date
            ? ` · ${new Date(c.confirmation.date).toLocaleString()}`
            : ""}
        </p>
        {c.previews.customer.status === "Stale" &&
          c.confirmation.outcome !== "Pending" && (
            <p className="field-error">
              Input liên quan đã thay đổi sau lần xác nhận này; xác nhận cũ
              không tự mất hiệu lực nhưng cần BA xem lại trước khi dùng cho
              Dev Review.
            </p>
          )}
        {!active.length ? (
          <Link className="text-link" to={casePath(c.id, "requirements")}>
            Chưa có Requirement active; tạo Requirement trước khi xác nhận →
          </Link>
        ) : (
          <div className="confirmation-scope-list">
            {active.map((r) => (
              <label className="confirmation-scope-row" key={r.id}>
                <div>
                  <strong>
                    {r.id} — {r.title}
                  </strong>
                  <span>rev{r.revision} · {r.module}</span>
                </div>
                <Badge tone={qualityTone(requirementQuality(c, r.id))}>
                  {requirementQuality(c, r.id)}
                </Badge>
                <input
                  type="checkbox"
                  checked={scope.includes(r.id)}
                  onChange={() => toggle(r.id)}
                  aria-label={`Đưa ${r.id} vào confirmation scope`}
                />
              </label>
            ))}
          </div>
        )}
      </section>

      {scope.length > 0 && (
        <section className="confirmation-section">
          <span className="confirmation-section-eyebrow">Review Package</span>
          <h3>Nội dung sẽ gửi review</h3>
          <p>
            {scope.length} / {qualitySummary(c).total} Requirement active ·{" "}
            <Link
              className="text-link"
              to={`${casePath(c.id, "handoff")}?scope=${encodeURIComponent(scope[0] ?? "")}`}
            >
              Xem CRD cho scope này →
            </Link>
          </p>
        </section>
      )}

      {blockedByNotExecuted ? (
        <section className="confirmation-not-ready">
          <h3>Chưa đủ điều kiện gửi Customer review</h3>
          <p>
            Requirement sau chưa từng chạy validation: {notExecuted.join(", ")}
            . Chạy Quality check trước khi gửi Customer review.
          </p>
          <Link className="text-link" to={casePath(c.id, "quality")}>
            Mở Quality Review →
          </Link>
        </section>
      ) : (
        <>
          {outstanding && (
            <section className="confirmation-section">
              <span className="confirmation-section-eyebrow">
                Outstanding Issues
              </span>
              <h3>Vấn đề cần biết trước khi quyết định</h3>
              <ul className="confirmation-outstanding">
                {notReady.map((id) => (
                  <li key={id}>
                    {id}: Quality {requirementQuality(c, id)}
                  </li>
                ))}
                {openGaps.map((g) => (
                  <li key={g.id}>
                    {g.id}: {g.description}
                  </li>
                ))}
              </ul>
              <p className="small muted">
                Những Requirement/Gap này vẫn có thể đưa vào Partial
                Confirmation hoặc Changes Requested; BA quyết định dựa trên
                tình trạng thực tế, không phải mặc định Confirmed.
              </p>
            </section>
          )}

          <section className="confirmation-section">
            <span className="confirmation-section-eyebrow">
              Stakeholder / Authority
            </span>
            <h3>Ai đang xác nhận</h3>
            <TextInput
              label="Approver role"
              value={approverRole}
              onChange={(e) => setApproverRole(e.target.value)}
            />
            <TextInput
              label="Approver identity"
              value={approverIdentity}
              onChange={(e) => setApproverIdentity(e.target.value)}
            />
          </section>

          <section className="confirmation-section confirmation-decision">
            <span className="confirmation-section-eyebrow">
              Customer Decision
            </span>
            <h3>Ghi nhận kết quả</h3>
            <Select
              label="Outcome"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as ConfirmationOutcome)}
            >
              <option>Confirmed</option>
              <option>Partially Confirmed</option>
              <option>Changes Requested</option>
            </Select>
            <Textarea
              label="Basis / evidence"
              value={basis}
              onChange={(e) => setBasis(e.target.value)}
            />
            <Textarea
              label="Comments (tuỳ chọn)"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
            {outcome === "Changes Requested" && (
              <Textarea
                label="Change requests"
                value={changeRequests}
                onChange={(e) => setChangeRequests(e.target.value)}
              />
            )}
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            <Button
              disabled={!scope.length}
              onClick={() => {
                try {
                  update(c.id, {
                    type: "confirmCustomer",
                    scopeReqIds: scope,
                    outcome,
                    approverRole,
                    approverIdentity,
                    basis,
                    comments,
                    changeRequests,
                  });
                  setError("");
                  setBasis("");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Ghi nhận Customer Confirmation
            </Button>
          </section>
        </>
      )}

      {c.confirmation.outcome !== "Pending" && (
        <section className="confirmation-record">
          <span className="confirmation-section-eyebrow">
            Confirmation Record
          </span>
          <dl>
            <dt>Outcome</dt>
            <dd>
              <StatusBadge category="confirmation" status={c.confirmation.outcome} />
            </dd>
            <dt>Scope</dt>
            <dd>{c.confirmation.scopeReqIds.join(", ") || "—"}</dd>
            <dt>Approver</dt>
            <dd>
              {c.confirmation.approverRole
                ? `${c.confirmation.approverRole} (${c.confirmation.approverIdentity})`
                : "—"}
            </dd>
            <dt>Date</dt>
            <dd>
              {c.confirmation.date
                ? new Date(c.confirmation.date).toLocaleString()
                : "—"}
            </dd>
            <dt>Linked document</dt>
            <dd>{c.confirmation.snapshotId ?? "Chưa gắn snapshot."}</dd>
          </dl>
          <p className="small muted">
            Dev Readiness chỉ quan sát scope này khi outcome là Confirmed hoặc
            Partially Confirmed; Confirmation không tự đổi Quality Ready hay
            Dev Acceptance.
          </p>
        </section>
      )}
    </div>
  );
}
