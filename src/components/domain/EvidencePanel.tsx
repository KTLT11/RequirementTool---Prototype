import { Link } from "react-router-dom";
import { TraceabilityPanel, entityPath } from "./TraceabilityPanel";
import { SectionSwitcher } from "../ui/SectionSwitcher";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import type { WorkCase, Module } from "../../types/case";
import {
  Card,
  Badge,
  Button,
  TextInput,
  Textarea,
  Select,
  Checkbox,
} from "../ui/primitives";
import { StatusBadge, StatusColumn } from "../ui/StatusBadge";
import { Drawer, Modal } from "../ui/Overlay";
import { useToast } from "../ui/Toast";
import { GapPanel } from "./GapPanel";
import { EvidenceReview } from "./V2Workspace";
import { authorized } from "../../services/discoveryService";
export function EvidencePanel({ workCase: c }: { workCase: WorkCase }) {
  const { update } = useApp();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const view = params.get("view") ?? "evidence";
  const gap = c.discovery.gaps.find((g) => g.id === params.get("gap"));
  const [selected, setSelected] = useState<string | null>(
    params.get("evidence"),
  );
  const [authority, setAuthority] = useState("");
  const [basis, setBasis] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [modules, setModules] = useState<Module[]>(["Core"]);
  const [note, setNote] = useState(""),
    [owner, setOwner] = useState(""),
    [decision, setDecision] = useState(""),
    [gapAuthority, setGapAuthority] = useState(""),
    [gapBasis, setGapBasis] = useState(""),
    [gapError, setGapError] = useState(""),
    [review, setReview] = useState<string | null>(null);
  useEffect(() => {
    setSelected(params.get("evidence"));
  }, [params]);
  const evidence = c.discovery.evidence.find((e) => e.id === selected);
  const reviewEvidence = c.discovery.evidence.find((e) => e.id === review);
  const run = (fn: () => void) => {
    try {
      fn();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const runGap = (fn: () => void) => {
    try {
      fn();
      setGapError("");
    } catch (e) {
      setGapError((e as Error).message);
    }
  };
  const close = () => {
    setSelected(null);
    const next = new URLSearchParams(params);
    next.delete("evidence");
    setParams(next, { replace: true });
    setError("");
  };
  const gapSources = gap
    ? c.discovery.evidence.filter((e) => gap.evidenceIds.includes(e.id))
    : [];
  const chosenGapEvidence = gapSources.find((e) => e.id === decision);
  const canResolveGap =
    !!gap &&
    !!chosenGapEvidence &&
    chosenGapEvidence.status === "Confirmed" &&
    chosenGapEvidence.review === "Reviewed" &&
    authorized(c, chosenGapEvidence, gapAuthority) &&
    !!gapBasis.trim();
  const conflictRows = c.discovery.gaps.filter((g) =>
    view === "clarifications" ? g.clarifications.length > 0 : g.type === "Conflict",
  );
  return (
    <div className="panel-stack">
      <SectionSwitcher
        label="Evidence views"
        value={view}
        onChange={(v) => setParams({ view: v })}
        items={[
          { value: "conflicts", label: "Conflicts" },
          { value: "clarifications", label: "Clarifications" },
          {
            value: "evidence",
            label: `Evidence · ${c.discovery.evidence.length}`,
          },
          {
            value: "stakeholders",
            label: `Stakeholders · ${c.discovery.stakeholders.length}`,
          },
          {
            value: "gaps",
            label: `Information Gaps · ${c.discovery.gaps.filter((g) => g.status !== "Resolved").length} còn mở`,
          },
        ]}
      />
      <div hidden={view !== "evidence"}>
        <Card>
          <div className="card-heading">
            <h3>Evidence library</h3>
          </div>
          <div className="card-content evidence-list">
            {c.discovery.evidence.map((e) => (
              <button
                className="evidence-row"
                type="button"
                key={e.id}
                onClick={() => {
                  setSelected(e.id);
                  setAuthority(e.authorityId || e.sourceId);
                  setBasis(e.basis);
                  setError("");
                }}
              >
                <div className="evidence-identity">
                  <strong>{e.id}</strong>
                  <span className="provenance">{e.provenance}</span>
                </div>
                <div className="evidence-content">
                  <p className="evidence-statement">{e.statement}</p>
                  <p className="evidence-meta">
                    {c.discovery.stakeholders.find((s) => s.id === e.sourceId)
                      ?.name ?? "Chưa có nguồn"}{" "}
                    · {e.questionId} · v{e.version}
                    {c.isDemo && e.status === "Confirmed"
                      ? " · demo scenario"
                      : ""}
                  </p>
                </div>
                <StatusColumn>
                  <StatusBadge category="evidence-review" status={e.review} />
                  <StatusBadge
                    category="evidence-confidence"
                    status={e.status}
                  />
                </StatusColumn>
              </button>
            ))}
            {!c.discovery.evidence.length && (
              <p>Chưa có evidence được ghi nhận.</p>
            )}
          </div>
        </Card>
      </div>
      <div hidden={view !== "stakeholders"}>
        <Card>
          <div className="card-heading">
            <h3>Stakeholders & authority</h3>
            <Button variant="secondary" onClick={() => setAdding(true)}>
              Thêm Stakeholder
            </Button>
          </div>
          <div className="card-content stakeholder-list">
            {c.discovery.stakeholders.map((s) => (
              <section key={s.id}>
                <h3>{s.name}</h3>
                <p>
                  {s.role} · {s.authority}
                </p>
                <p className="muted">
                  {s.id} · {s.modules.join(", ")} · {s.provenance}
                </p>
              </section>
            ))}
          </div>
        </Card>
      </div>
      <div hidden={view !== "conflicts" && view !== "clarifications"}>
        {!gap ? (
          <Card>
            <div className="card-heading">
              <h3>
                {view === "conflicts"
                  ? "Mâu thuẫn nguồn thông tin"
                  : "Thông tin cần xử lý"}
              </h3>
            </div>
            <div className="card-content">
              {conflictRows.map((g) => (
                <Link
                  className="entity-row"
                  key={g.id}
                  to={entityPath(c, "gap", g.id)}
                >
                  <strong>{g.description}</strong>
                  <span>
                    {g.type} · {g.status}
                  </span>
                  <small>{g.id}</small>
                </Link>
              ))}
              {!conflictRows.length && (
                <p className="muted">Không có nội dung trong view này.</p>
              )}
            </div>
          </Card>
        ) : (
          <Card>
            <div className="card-heading conflict-header">
              <div>
                <span className="provenance">
                  {gap.id} · {gap.questionId}
                </span>
                <h2>
                  {gap.type === "Conflict"
                    ? "Mâu thuẫn thời hạn hoàn tiền"
                    : gap.description}
                </h2>
              </div>
              <Badge tone={gap.status === "Resolved" ? "sage" : "warning"}>
                {gap.status}
              </Badge>
              <Link
                className="text-link"
                to={entityPath(c, "question", gap.questionId)}
              >
                Quay lại đúng câu hỏi →
              </Link>
            </div>
            <div className="card-content">
              <div className="source-comparison">
              {gapSources.map((s, i) => (
                <Card key={s.id}>
                  <div className="card-heading">
                    <h3>
                      Nguồn {i + 1}:{" "}
                      {c.discovery.stakeholders.find(
                        (st) => st.id === s.sourceId,
                      )?.name ?? "Chưa có nguồn"}
                    </h3>
                  </div>
                  <div className="card-content">
                    <blockquote className="source-excerpt">
                      {s.statement}
                    </blockquote>
                    <p className="provenance">
                      {s.id} · v{s.version}
                    </p>
                    <div className="badge-group">
                      <StatusBadge
                        category="evidence-review"
                        status={s.review}
                      />
                      <StatusBadge
                        category="evidence-confidence"
                        status={s.status}
                      />
                    </div>
                    <p className="small muted">
                      {
                        c.discovery.stakeholders.find(
                          (st) => st.id === s.sourceId,
                        )?.authority
                      }
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => setReview(s.id)}
                    >
                      Review nguồn và căn cứ xác minh
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
            <div className="resolution-workbench">
              <section>
                <h3>1. Ghi việc cần làm rõ</h3>
                <p className="muted">
                  Clarification ghi lại câu hỏi và người cần trả lời; chưa
                  giải quyết mâu thuẫn.
                </p>
                {gap.clarifications.map((n) => (
                  <p key={n.id} className="inline-feedback">
                    {n.text} ·{" "}
                    {
                      c.discovery.stakeholders.find((s) => s.id === n.owner)
                        ?.name
                    }
                  </p>
                ))}
                <Textarea
                  label="Nội dung clarification"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Select
                  label="Người cần làm rõ"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                >
                  <option value="">Chọn stakeholder</option>
                  {c.discovery.stakeholders.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
                <Button
                  variant="secondary"
                  disabled={!note.trim() || !owner}
                  onClick={() =>
                    runGap(() => {
                      update(c.id, {
                        type: "clarify",
                        gapId: gap.id,
                        text: note,
                        owner,
                      });
                      setNote("");
                    })
                  }
                >
                  Ghi clarification cho Gap này
                </Button>
              </section>
              <section>
                <h3>2. Quyết định có authority</h3>
                <p className="muted">
                  Review nguồn → Evidence Confirmed → chọn người quyết định và
                  căn cứ → ghi resolution.
                </p>
                <Select
                  label="Evidence làm căn cứ quyết định"
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                >
                  <option value="">Chọn evidence</option>
                  {gapSources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.statement} · {s.status}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Authority cho Resolution"
                  value={gapAuthority}
                  onChange={(e) => setGapAuthority(e.target.value)}
                >
                  <option value="">Chọn người có thẩm quyền</option>
                  {c.discovery.stakeholders.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.role}
                    </option>
                  ))}
                </Select>
                <Textarea
                  label="Căn cứ quyết định và phạm vi áp dụng"
                  value={gapBasis}
                  onChange={(e) => setGapBasis(e.target.value)}
                />
                <Button
                  disabled={!canResolveGap}
                  onClick={() =>
                    runGap(() =>
                      update(c.id, {
                        type: "resolve",
                        gapId: gap.id,
                        evidenceId: decision,
                        authorityId: gapAuthority,
                        basis: gapBasis,
                      }),
                    )
                  }
                >
                  Ghi Resolution với căn cứ
                </Button>
                {!canResolveGap && (
                  <p className="field-hint">
                    Cần Evidence Reviewed + Confirmed, đúng authority của
                    nguồn và căn cứ quyết định. Review nguồn ở phía trên
                    trước.
                  </p>
                )}
                {gap.resolution && (
                  <p className="inline-feedback">
                    Đã ghi nhận: {gap.resolution.basis}. Giữ cả các nguồn để
                    truy vết; downstream preview cần review lại.
                  </p>
                )}
              </section>
            </div>
            {gapError && (
              <p role="alert" className="field-error">
                {gapError}
              </p>
            )}
            <details className="disclosure">
              <summary>Nguồn upstream và tác động downstream</summary>
              <TraceabilityPanel workCase={c} kind="gap" id={gap.id} />
            </details>
            </div>
          </Card>
        )}
        <Drawer
          open={!!reviewEvidence}
          title="Review Evidence của Gap"
          description={reviewEvidence?.id}
          onClose={() => setReview(null)}
        >
          {reviewEvidence && (
            <EvidenceReview
              key={reviewEvidence.id}
              workCase={c}
              evidence={reviewEvidence}
            />
          )}
        </Drawer>
      </div>
      <div hidden={view !== "gaps"}>
        <GapPanel workCase={c} />
      </div>
      <Drawer
        open={!!evidence}
        title="Evidence detail"
        description={evidence?.id}
        onClose={close}
        footer={
          <Button variant="secondary" onClick={close}>
            Đóng
          </Button>
        }
      >
        {evidence && (
          <>
            <p>{evidence.statement}</p>
            <p className="provenance mt-3">
              {evidence.provenance} · {evidence.sourceId} · v{evidence.version}{" "}
              · {evidence.questionId}
            </p>
            <div className="badge-group">
              <StatusBadge
                category="evidence-review"
                status={evidence.review}
                showCategory
              />
              <StatusBadge
                category="evidence-confidence"
                status={evidence.status}
                showCategory
                suffix={
                  c.isDemo && evidence.status === "Confirmed"
                    ? " · demo scenario"
                    : undefined
                }
              />
            </div>
            <hr />
            <h3>BA review</h3>
            <p className="muted mt-3">Review không tự xác nhận thông tin.</p>
            <div className="action-row">
              <Button
                variant="secondary"
                disabled={evidence.status === "Superseded"}
                onClick={() =>
                  run(() =>
                    update(c.id, {
                      type: "review",
                      evidenceId: evidence.id,
                      review: "Reviewed",
                    }),
                  )
                }
              >
                Mark Reviewed
              </Button>
              <Button
                variant="ghost"
                disabled={evidence.status === "Superseded"}
                onClick={() =>
                  run(() =>
                    update(c.id, {
                      type: "review",
                      evidenceId: evidence.id,
                      review: "Needs Clarification",
                    }),
                  )
                }
              >
                Needs Clarification
              </Button>
            </div>
            <hr />
            <h3>Căn cứ xác nhận</h3>
            <div className="form-stack mt-3">
              <Select
                label="Authority xác nhận"
                value={authority || evidence.sourceId}
                onChange={(e) => setAuthority(e.target.value)}
              >
                <option value="">Chọn authority</option>
                {c.discovery.stakeholders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.role}
                  </option>
                ))}
              </Select>
              <Textarea
                label="Căn cứ xác nhận Evidence"
                value={basis}
                onChange={(e) => setBasis(e.target.value)}
                rows={4}
              />
              <Button
                disabled={evidence.status === "Superseded"}
                onClick={() =>
                  run(() => {
                    update(c.id, {
                      type: "confirm",
                      evidenceId: evidence.id,
                      authorityId: authority || evidence.sourceId,
                      basis,
                    });
                    toast(
                      c.isDemo
                        ? "Đã xác nhận evidence trong kịch bản mẫu."
                        : "Đã ghi căn cứ xác nhận evidence.",
                    );
                  })
                }
              >
                Ghi nhận Evidence Confirmed
              </Button>
            </div>
            {error && (
              <p className="field-error mt-3" role="alert">
                {error}
              </p>
            )}
            <details className="disclosure">
              <summary>Traceability — nguồn và nơi sử dụng Evidence</summary>
              <TraceabilityPanel
                workCase={c}
                kind="evidence"
                id={evidence.id}
              />
            </details>
          </>
        )}
      </Drawer>
      <Modal
        open={adding}
        title="Thêm Stakeholder"
        onClose={() => setAdding(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Hủy
            </Button>
            <Button
              onClick={() =>
                run(() => {
                  update(c.id, {
                    type: "stakeholder",
                    name,
                    role,
                    authority: description,
                    modules,
                  });
                  setAdding(false);
                  setName("");
                  setDescription("");
                  toast("Đã lưu stakeholder.");
                })
              }
            >
              Lưu Stakeholder
            </Button>
          </>
        }
      >
        <div className="form-stack">
          <TextInput
            label="Tên stakeholder"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextInput
            label="Vai trò"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          <Textarea
            label="Authority / trách nhiệm xác minh"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p>Phạm vi thông tin có thể xác minh:</p>
          {(
            [
              "Core",
              "Process",
              "Business Rule",
              "Integration",
              "Exception",
            ] as Module[]
          ).map((m) => (
            <Checkbox
              key={m}
              label={m}
              checked={modules.includes(m)}
              onChange={(e) =>
                setModules(
                  e.target.checked
                    ? [...modules, m]
                    : modules.filter((x) => x !== m),
                )
              }
            />
          ))}
          {error && <p className="field-error">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
