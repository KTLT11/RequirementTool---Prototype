import { Link, useNavigate } from "react-router-dom";
import { casePath } from "../../app/navigation";
import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { useToast } from "../ui/Toast";
import {
  Button,
  Card,
  Textarea,
  TextInput,
  Select,
} from "../ui/primitives";
import { Modal } from "../ui/Overlay";
import { contextReady, mode } from "../../services/discoveryService";
import { ContextDirectionAssist } from './DemoAssistance';
import type { WorkCase } from "../../types/case";
export function ContextPanel({ workCase: c }: { workCase: WorkCase }) {
  const { update } = useApp();
  const navigate = useNavigate();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => structuredClone(c.context));
  const [error, setError] = useState("");
  const run = (fn: () => void) => {
    try {
      fn();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Card>
      <div className="card-heading">
        <h3>Context analysis</h3>
        <Button
          variant="secondary"
          onClick={() => {
            setDraft(structuredClone(c.context));
            setEditing(true);
          }}
        >
          Điều chỉnh context
        </Button>
      </div>
      <div className="card-content">
        <section className="checkpoint-guidance">
          <h3>What needs to be completed before Discovery?</h3>
          <ul>
            {c.context.items
              .filter(
                (i) =>
                  !i.text.trim() ||
                  (i.certainty !== "Known" &&
                    (!i.owner || !i.nextAction.trim())),
              )
              .map((i) => (
                <li key={i.id}>
                  Bổ sung {i.label}: nội dung, owner và follow-up cho thông tin
                  chưa rõ.
                </li>
              ))}
            {c.context.suggestionStatus !== "Accepted" && (
              <li>Review và chấp nhận/điều chỉnh hướng Discovery.</li>
            )}
            {!c.context.reviewed && <li>Ghi nhận BA đã review bối cảnh.</li>}
            {c.context.reassessmentRequired && (
              <li>Thông tin nguồn thay đổi: reassess complexity/context.</li>
            )}
          </ul>
          {contextReady(c) && (
            <p>
              Đã đủ điều kiện Context trong phạm vi prototype. Evidence
              confirmation được quản lý riêng.
            </p>
          )}
          <div className="action-row">
            {c.context.suggestionStatus !== "Accepted" && (
              <a href="#context-direction" className="btn btn-primary">
                Review hướng Discovery trước
              </a>
            )}
            <Button
              variant={
                c.context.suggestionStatus === "Accepted"
                  ? "primary"
                  : "secondary"
              }
              disabled={c.context.suggestionStatus !== "Accepted"}
              onClick={() =>
                run(() => {
                  update(c.id, { type: "contextReview" });
                  toast("Đã review context; evidence status giữ riêng.");
                })
              }
            >
              Ghi nhận đã review bối cảnh
            </Button>
            <Button
              variant="secondary"
              disabled={!contextReady(c)}
              onClick={() =>
                run(() => {
                  update(c.id, { type: "advance", stage: "discovery" });
                  navigate(casePath(c.id, "discovery"));
                })
              }
            >
              Tiếp tục Discovery
            </Button>
          </div>
        </section>
        <div className="context-triad">
          {(
            [
              ["Known", "What We Know"],
              ["Unknown", "What We Don't Know"],
              ["Assumption", "Assumptions"],
            ] as const
          ).map(([certainty, label]) => (
            <section
              key={certainty}
              className={`context-group context-${certainty.toLowerCase()}`}
            >
              <h3>{label}</h3>
              {c.context.items
                .filter((i) => i.certainty === certainty)
                .slice(0, certainty === "Known" ? 2 : Infinity)
                .map((i) => (
                  <div key={i.id}>
                    <strong>{i.label}</strong>
                    <p>{i.text || "Chưa cung cấp."}</p>
                    <span className="provenance">{i.provenance}</span>
                    {certainty !== "Known" && (
                      <p className="small muted">
                        {c.discovery.stakeholders.find((s) => s.id === i.owner)
                          ?.name ??
                          i.owner ??
                          "Chưa có owner"}{" "}
                        · {i.nextAction || "Cần follow-up"}
                      </p>
                    )}
                  </div>
                ))}
              {certainty === "Known" && (
                <details className="disclosure">
                  <summary>Xem scope, outcome và actors</summary>
                  {c.context.items
                    .filter((i) => i.certainty === "Known")
                    .slice(2)
                    .map((i) => (
                      <div key={i.id}>
                        <strong>{i.label}</strong>
                        <p>{i.text}</p>
                        <span className="provenance">{i.provenance}</span>
                      </div>
                    ))}
                </details>
              )}
            </section>
          ))}
        </div>
        <Link className="text-link" to={casePath(c.id, "sources")}>
          Xem request, tài liệu và source excerpts →
        </Link>
        <hr />
        <div className="assessment-grid">
          <section className="assessment-pane">
            {" "}
            <h3>Complexity assessment</h3>
            <p className="mt-3">
              Scope & Impact: {c.context.complexity[0]} · Pattern & Dependency:{" "}
              {c.context.complexity[1]} · Uncertainty & Risk:{" "}
              {c.context.complexity[2]}
            </p>
            <p>{c.context.complexityReason}</p>
            <p className="muted">
              Discovery mode đề xuất: {mode(c)} ·{" "}
              {c.context.complexityProvenance}
            </p>
          </section>
          <section className="assessment-pane">
            {" "}
            <h3 id="context-direction">Discovery hypothesis</h3>
            <ContextDirectionAssist key={c.id} workCase={c} />
          </section>
        </div>
        <hr />
        <p>
          <strong>Context Ready:</strong> {contextReady(c) ? "Pass" : "Unknown"}
        </p>
        {c.context.reassessmentRequired && (
          <p className="field-error">
            Thông tin mới ảnh hưởng uncertainty/dependency; cần reassess
            context.
          </p>
        )}

        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <Modal
        open={editing}
        title="Context Assessment"
        onClose={() => setEditing(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Hủy
            </Button>
            <Button
              onClick={() =>
                run(() => {
                  update(c.id, { type: "context", context: draft });
                  setEditing(false);
                  toast("Đã lưu context; cần BA review lại.");
                })
              }
            >
              Lưu context
            </Button>
          </>
        }
      >
        <div className="form-stack">
          {draft.items.map((item, index) => (
            <fieldset key={item.id} className="context-edit">
              <legend>{item.label}</legend>
              <Textarea
                label={`Nội dung ${item.label}`}
                value={item.text}
                rows={2}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    items: draft.items.map((i, n) =>
                      n === index
                        ? {
                            ...i,
                            text: e.target.value,
                            provenance: "BA-entered Information",
                          }
                        : i,
                    ),
                  })
                }
              />
              <Select
                label={`Trạng thái ${item.label}`}
                value={item.certainty}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    items: draft.items.map((i, n) =>
                      n === index
                        ? {
                            ...i,
                            certainty: e.target.value as typeof i.certainty,
                          }
                        : i,
                    ),
                  })
                }
              >
                <option>Known</option>
                <option>Unknown</option>
                <option>Assumption</option>
              </Select>
              {item.certainty !== "Known" && (
                <>
                  <TextInput
                    label={`Owner ${item.label}`}
                    value={item.owner}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        items: draft.items.map((i, n) =>
                          n === index ? { ...i, owner: e.target.value } : i,
                        ),
                      })
                    }
                  />
                  <TextInput
                    label={`Follow-up ${item.label}`}
                    value={item.nextAction}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        items: draft.items.map((i, n) =>
                          n === index
                            ? { ...i, nextAction: e.target.value }
                            : i,
                        ),
                      })
                    }
                  />
                </>
              )}
            </fieldset>
          ))}
          {["Scope & Impact", "Pattern & Dependency", "Uncertainty & Risk"].map(
            (label, index) => (
              <Select
                key={label}
                label={label}
                value={draft.complexity[index]}
                onChange={(e) => {
                  const values = [
                    ...draft.complexity,
                  ] as typeof draft.complexity;
                  values[index] = e.target.value;
                  setDraft({ ...draft, complexity: values });
                }}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </Select>
            ),
          )}
          <Textarea
            label="Căn cứ Complexity"
            value={draft.complexityReason}
            onChange={(e) =>
              setDraft({ ...draft, complexityReason: e.target.value })
            }
          />
          <Textarea
            label="Discovery Hypothesis"
            value={draft.hypothesis}
            onChange={(e) => setDraft({ ...draft, hypothesis: e.target.value })}
          />
        </div>
      </Modal>
    </Card>
  );
}
