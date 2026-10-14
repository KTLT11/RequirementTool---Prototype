import { useState } from "react";
import {
  Link,
  useSearchParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import type { WorkCase } from "../../types/case";
import type {
  Requirement,
  RequirementModule,
  AcceptanceCriterion,
  Layer2Command,
} from "../../types/requirement";
import {
  layer2,
  requirementModules,
  moduleFields,
  fieldLabels,
  requirementQuality,
  qualitySummary,
} from "../../services/requirementService";
import {
  qualityRules,
  reviewableChecks,
} from "../../services/validationService";
import { useApp } from "../../context/AppContext";
import { questions } from "../../data/questions";
import {
  Button,
  Card,
  Badge,
  TextInput,
  Textarea,
  Select,
  Checkbox,
} from "../ui/primitives";
import { Modal } from "../ui/Overlay";
import { TraceabilityPanel, entityPath } from "./TraceabilityPanel";
import { casePath } from "../../app/navigation";

export function FormationDialog({
  workCase: c,
  questionId,
  onClose,
}: {
  workCase: WorkCase;
  questionId?: string;
  onClose: () => void;
}) {
  const { update } = useApp(),
    nav = useNavigate();
  const [title, setTitle] = useState(""),
    [module, setModule] = useState<RequirementModule>("Process"),
    [qids, setQids] = useState<string[]>(questionId ? [questionId] : []),
    [eids, setEids] = useState<string[]>([]),
    [error, setError] = useState("");
  const toggle = (values: string[], id: string) =>
    values.includes(id) ? values.filter((x) => x !== id) : [...values, id];
  return (
    <Modal
      open
      onClose={onClose}
      title="Tạo Requirement Draft"
      description="Chọn nguồn để giữ traceability. Nội dung chưa xác minh vẫn là đề xuất, cần BA review."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={() => {
              try {
                update(c.id, {
                  type: "layer2",
                  command: {
                    op: "create",
                    title,
                    module,
                    questionIds: qids,
                    evidenceIds: eids,
                  },
                });
                onClose();
                nav(`${casePath(c.id, "requirements")}?latest=1`);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Tạo Draft từ nguồn đã chọn
          </Button>
        </>
      }
    >
      <TextInput
        label="Tên Requirement"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Select
        label="Module Requirement"
        value={module}
        onChange={(e) => setModule(e.target.value as RequirementModule)}
      >
        {requirementModules.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </Select>
      <h3>Discovery / Required Information</h3>
      <div className="source-choices">
        {questions.map((q) => (
          <div key={q.id}>
            <Checkbox
              label={`${q.question} · ${q.infoId}`}
              checked={qids.includes(q.id)}
              onChange={() => setQids(toggle(qids, q.id))}
            />
            {qids.includes(q.id) && (
              <p className="small muted">
                {c.discovery.responses.find((r) => r.questionId === q.id)
                  ?.text || "Chưa có response"}{" "}
                ·{" "}
                {c.discovery.gaps.find((g) => g.questionId === q.id)?.status ||
                  "Unknown"}
              </p>
            )}
          </div>
        ))}
      </div>
      <details className="disclosure" open={!!questionId}>
        <summary>Supporting Evidence</summary>
        {c.discovery.evidence
          .filter((e) => e.status !== "Superseded")
          .map((e) => (
            <Checkbox
              key={e.id}
              label={`${e.statement} · ${e.review} / ${e.status}`}
              checked={eids.includes(e.id)}
              onChange={() => {
                setEids(toggle(eids, e.id));
                if (!qids.includes(e.questionId))
                  setQids([...qids, e.questionId]);
              }}
            />
          ))}
      </details>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
export function RequirementWorkspace({ workCase: c }: { workCase: WorkCase }) {
  const { update } = useApp();
  const [params, setParams] = useSearchParams();
  const l = layer2(c);
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("All"),
    [status, setStatus] = useState("Active"),
    [creating, setCreating] = useState(false),
    [archive, setArchive] = useState(false),
    [splitting, setSplitting] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const req =
    (params.has("latest")
      ? l.requirements.at(-1)
      : l.requirements.find((r) => r.id === params.get("requirement"))) ||
    l.requirements.find((r) => r.status !== "Archived");
  const draft = req ? (l.drafts[req.id] ?? req) : undefined,
    tab = params.get("tab") || "content";
  const list = l.requirements.filter(
    (r) =>
      (status === "All" || r.status !== "Archived") &&
      (filter === "All" || r.module === filter) &&
      `${r.title} ${r.id}`.toLowerCase().includes(search.toLowerCase()),
  );
  const run = (command: Layer2Command) => {
    try {
      update(c.id, { type: "layer2", command });
      setError("");
      setMessage(
        command.op === "save"
          ? "Đã lưu. Kết quả phụ thuộc cần re-validation."
          : "Đã cập nhật shared state.",
      );
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const edit = (value: Requirement) => {
    run({ op: "draft", requirement: value });
    setMessage("Draft đã giữ trên trình duyệt.");
  };
  const choose = (id: string, nextTab = tab, ac?: string) => {
    const next = new URLSearchParams(params);
    next.delete("latest");
    next.set("requirement", id);
    next.set("tab", nextTab);
    if (ac) next.set("ac", ac);
    else next.delete("ac");
    setParams(next);
    setMessage("");
    setError("");
  };
  return (
    <div className="panel-stack">
      <div className="workbench-toolbar">
        <p className="muted">
          Tạo Draft từ Discovery, chỉnh nội dung và AC, rồi kiểm tra chất lượng.
          Draft chưa phải business decision đã xác nhận.
        </p>
        <Button onClick={() => setCreating(true)}>+ Tạo Requirement</Button>
      </div>
      <div className="l2-workbench">
        <aside className="l2-list">
          <TextInput
            label="Tìm Requirement"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            label="Lọc module"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option>All</option>
            {requirementModules.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
          <Select
            label="Phạm vi danh sách"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>Active</option>
            <option>All</option>
          </Select>
          {list.map((r) => (
            <button
              className={`entity-row ${req?.id === r.id ? "selected" : ""}`}
              key={r.id}
              onClick={() => choose(r.id)}
            >
              <strong>{r.title}</strong>
              <small>
                {r.id} · {r.module}
              </small>
              <span>
                {r.status} · {requirementQuality(c, r.id)}
                {l.drafts[r.id] ? " · Draft chưa lưu" : ""}
              </span>
            </button>
          ))}
          {!list.length && <p>Không có Requirement trong bộ lọc.</p>}
        </aside>
        {req && draft ? (
          <section className="l2-detail">
            <div className="card-heading">
              <div>
                <span className="small muted">
                  {req.id} · revision {req.revision} · {req.origin}
                </span>
                <h3>{req.title}</h3>
              </div>
              <Badge
                tone={
                  requirementQuality(c, req.id) === "Quality Ready"
                    ? "sage"
                    : "warning"
                }
              >
                {req.status} · {requirementQuality(c, req.id)}
              </Badge>
            </div>
            <nav className="l2-tabs" aria-label="Requirement details">
              {[
                ["content", "Nội dung"],
                ["ac", `Acceptance Criteria (${draft.ac.length})`],
                ["trace", "Nguồn & liên kết"],
                ["quality", "Chất lượng"],
              ].map(([value, title]) => (
                <button
                  key={value}
                  aria-pressed={tab === value}
                  onClick={() => choose(req.id, value)}
                >
                  {title}
                </button>
              ))}
            </nav>
            {req.status === "Archived" ? (
              <p className="inline-feedback">
                Requirement đã archive; AC, references và lịch sử được giữ để
                truy vết.
              </p>
            ) : (
              <>
                {tab === "content" && (
                  <div className="panel-stack">
                    <TextInput
                      label="Tên Requirement"
                      value={draft.title}
                      onChange={(e) =>
                        edit({ ...draft, title: e.target.value })
                      }
                    />
                    <Select
                      label="Loại / Module"
                      value={draft.module}
                      onChange={(e) =>
                        edit({
                          ...draft,
                          module: e.target.value as RequirementModule,
                        })
                      }
                    >
                      {requirementModules.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </Select>
                    <Textarea
                      label="Requirement statement"
                      rows={3}
                      value={draft.statement}
                      onChange={(e) =>
                        edit({ ...draft, statement: e.target.value })
                      }
                    />
                    <div className="l2-fields">
                      {moduleFields[draft.module].map((k) => (
                        <Textarea
                          key={k}
                          label={fieldLabels[k]}
                          rows={2}
                          value={draft.fields[k]}
                          onChange={(e) =>
                            edit({
                              ...draft,
                              fields: { ...draft.fields, [k]: e.target.value },
                            })
                          }
                        />
                      ))}
                    </div>
                    <p className="small muted">
                      Review judgment được ghi theo từng criterion ở Quality
                      Review. Lưu text không tự Reviewed hoặc Confirmed.
                    </p>
                  </div>
                )}
                {tab === "ac" && (
                  <div className="panel-stack">
                    <div className="workbench-toolbar">
                      <p>
                        Coverage được map theo scenario áp dụng; không kiểm tra
                        bằng từ khóa.
                      </p>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          edit({
                            ...draft,
                            ac: [
                              ...draft.ac,
                              {
                                id: `AC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
                                title: "AC mới",
                                format: "Condition/Outcome",
                                condition: "",
                                input: "",
                                outcome: "",
                                verification: "",
                                scenarioIds: [],
                                evidenceIds: [],
                                status: "Draft",
                              },
                            ],
                          })
                        }
                      >
                        + Thêm AC
                      </Button>
                    </div>
                    <details
                      className="disclosure"
                      open={!draft.scenarios.length}
                    >
                      <summary>
                        Scenario áp dụng ({draft.scenarios.length}) và căn cứ
                      </summary>
                      <Select
                        label="Applicability của scenario coverage"
                        value={draft.coverageApplicability ?? "Applicable"}
                        onChange={(e) =>
                          edit({
                            ...draft,
                            coverageApplicability: e.target
                              .value as Requirement["coverageApplicability"],
                          })
                        }
                      >
                        <option>Applicable</option>
                        <option>Unknown</option>
                        <option>N/A</option>
                      </Select>
                      <Textarea
                        label="Căn cứ applicability / phạm vi edge cases"
                        value={draft.applicabilityBasis}
                        onChange={(e) =>
                          edit({ ...draft, applicabilityBasis: e.target.value })
                        }
                      />
                      {draft.scenarios.map((s, i) => (
                        <div className="l2-scenario" key={s.id}>
                          <TextInput
                            label={`Scenario ${i + 1}`}
                            value={s.title}
                            onChange={(e) =>
                              edit({
                                ...draft,
                                scenarios: draft.scenarios.map((x) =>
                                  x.id === s.id
                                    ? { ...x, title: e.target.value }
                                    : x,
                                ),
                              })
                            }
                          />
                          <Button
                            variant="ghost"
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Bỏ scenario này và mapping coverage khỏi các AC? Cần BA review lại applicability.",
                                )
                              )
                                edit({
                                  ...draft,
                                  scenarios: draft.scenarios.filter(
                                    (x) => x.id !== s.id,
                                  ),
                                  ac: draft.ac.map((a) => ({
                                    ...a,
                                    scenarioIds: a.scenarioIds.filter(
                                      (id) => id !== s.id,
                                    ),
                                  })),
                                });
                            }}
                          >
                            Bỏ scenario
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="secondary"
                        onClick={() =>
                          edit({
                            ...draft,
                            scenarios: [
                              ...draft.scenarios,
                              {
                                id: `SCN-${crypto.randomUUID().slice(0, 8)}`,
                                title: "Scenario cần làm rõ",
                              },
                            ],
                          })
                        }
                      >
                        + Thêm scenario
                      </Button>
                    </details>
                    {draft.ac.map((a) => (
                      <ACEditor
                        key={a.id}
                        ac={a}
                        requirement={draft}
                        workCase={c}
                        selected={params.get("ac") === a.id}
                        onChange={(v) =>
                          edit({
                            ...draft,
                            ac: draft.ac.map((x) => (x.id === a.id ? v : x)),
                          })
                        }
                        onDelete={() => {
                          if (
                            window.confirm(
                              "Xóa AC khỏi Draft? Coverage và kết quả kiểm tra phụ thuộc cần chạy lại.",
                            )
                          )
                            edit({
                              ...draft,
                              ac: draft.ac.filter((x) => x.id !== a.id),
                            });
                        }}
                      />
                    ))}
                    {!draft.ac.length && (
                      <p className="inline-feedback">
                        Chưa có AC; thêm điều kiện/kết quả có thể kiểm chứng.
                      </p>
                    )}
                  </div>
                )}
                {tab === "trace" && (
                  <>
                    <details className="disclosure" open>
                      <summary>
                        Chỉnh nguồn / dependency của Requirement
                      </summary>
                      <p className="small muted">
                        Unlink sẽ thay đổi căn cứ validation; nguồn và lịch sử
                        vẫn được giữ.
                      </p>
                      {questions.map((q) => (
                        <Checkbox
                          key={q.id}
                          label={`${q.question} · ${q.infoId}`}
                          checked={draft.questionIds.includes(q.id)}
                          onChange={() =>
                            edit({
                              ...draft,
                              questionIds: draft.questionIds.includes(q.id)
                                ? draft.questionIds.filter((id) => id !== q.id)
                                : [...draft.questionIds, q.id],
                            })
                          }
                        />
                      ))}
                      <h3>Evidence</h3>
                      {c.discovery.evidence.map((e) => (
                        <Checkbox
                          key={e.id}
                          label={`${e.statement} · ${e.status}`}
                          checked={draft.evidenceIds.includes(e.id)}
                          onChange={() =>
                            edit({
                              ...draft,
                              evidenceIds: draft.evidenceIds.includes(e.id)
                                ? draft.evidenceIds.filter((id) => id !== e.id)
                                : [...draft.evidenceIds, e.id],
                            })
                          }
                        />
                      ))}
                      <h3>Requirement dependency</h3>
                      {l.requirements
                        .filter(
                          (x) => x.id !== req.id && x.status !== "Archived",
                        )
                        .map((x) => (
                          <Checkbox
                            key={x.id}
                            label={x.title}
                            checked={draft.relatedIds.includes(x.id)}
                            onChange={() =>
                              edit({
                                ...draft,
                                relatedIds: draft.relatedIds.includes(x.id)
                                  ? draft.relatedIds.filter((id) => id !== x.id)
                                  : [...draft.relatedIds, x.id],
                              })
                            }
                          />
                        ))}
                    </details>
                    <TraceabilityPanel
                      workCase={c}
                      kind="requirement"
                      id={req.id}
                    />
                  </>
                )}
                {tab === "quality" && (
                  <>
                    <p>
                      {requirementQuality(c, req.id)} ·{" "}
                      {
                        l.results.filter(
                          (x) =>
                            x.requirementId === req.id &&
                            (x.status === "Fail" || x.status === "Unknown"),
                        ).length
                      }{" "}
                      findings cần xử lý.
                    </p>
                    <Link
                      className="btn btn-secondary"
                      to={`${casePath(c.id, "quality")}?requirement=${req.id}`}
                    >
                      Mở Quality Review của Requirement
                    </Link>
                    <details className="disclosure">
                      <summary>Xem checklist gần nhất</summary>
                      {l.results
                        .filter((x) => x.requirementId === req.id)
                        .map((x) => (
                          <p key={x.id}>
                            {x.checkId} · {x.status} · {x.freshness}:{" "}
                            {x.explanation}
                          </p>
                        ))}
                    </details>
                  </>
                )}
                <div className="l2-savebar">
                  <Button
                    disabled={!l.drafts[req.id]}
                    onClick={() => run({ op: "save", requirement: draft })}
                  >
                    Lưu Requirement & AC
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={!!l.drafts[req.id]}
                    onClick={() => run({ op: "validate", ids: [req.id] })}
                  >
                    Kiểm tra Requirement này
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={!l.drafts[req.id]}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Bỏ các thay đổi chưa lưu của Requirement này?",
                        )
                      )
                        run({ op: "discard", id: req.id });
                    }}
                  >
                    Bỏ draft
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={!!l.drafts[req.id]}
                    onClick={() => setSplitting(true)}
                  >
                    Phân tách behavior
                  </Button>
                  <Button variant="ghost" onClick={() => setArchive(true)}>
                    Archive
                  </Button>
                </div>
                {l.drafts[req.id] && (
                  <p className="small muted">
                    Draft được giữ khi chuyển workspace. Lưu để validation dùng
                    đúng nội dung.
                  </p>
                )}
              </>
            )}
            {message && (
              <p role="status" className="inline-feedback">
                {message}
              </p>
            )}
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
          </section>
        ) : (
          <Card>
            <div className="card-content">
              <h3>Chưa có Requirement</h3>
              <p>Tạo Draft hoặc chọn nguồn trong Discovery để bắt đầu.</p>
            </div>
          </Card>
        )}
      </div>
      {splitting && req && (
        <SplitDialog
          workCase={c}
          requirement={req}
          onClose={() => setSplitting(false)}
        />
      )}{" "}
      {creating && (
        <FormationDialog workCase={c} onClose={() => setCreating(false)} />
      )}
      <Modal
        open={archive}
        title="Archive Requirement"
        onClose={() => setArchive(false)}
        description="Requirement sẽ rời scope active; AC, nguồn và các lần validation lịch sử được giữ. Dependency dùng Requirement này cần review lại."
        footer={
          <>
            <Button variant="secondary" onClick={() => setArchive(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                if (req) run({ op: "archive", id: req.id });
                setArchive(false);
              }}
            >
              Xác nhận Archive
            </Button>
          </>
        }
      >
        <p>
          {req?.title} · {req?.id}
        </p>
        <p>
          {l.requirements
            .filter((x) => x.relatedIds.includes(req?.id || ""))
            .map((x) => x.title)
            .join(", ") || "Không có Requirement phụ thuộc được ghi nhận."}
        </p>
      </Modal>
    </div>
  );
}
function ACEditor({
  ac: a,
  requirement: r,
  workCase: c,
  onChange,
  onDelete,
  selected,
}: {
  ac: AcceptanceCriterion;
  requirement: Requirement;
  workCase: WorkCase;
  onChange: (a: AcceptanceCriterion) => void;
  onDelete: () => void;
  selected: boolean;
}) {
  const [expanded, setExpanded] = useState(
    selected || !a.condition || !a.outcome,
  );
  return (
    <details
      className="disclosure ac-editor"
      open={expanded || selected}
      onToggle={(e) => setExpanded(e.currentTarget.open)}
    >
      <summary>
        {a.title} · {a.id} · {a.status} · {a.scenarioIds.length} scenario
      </summary>
      <TextInput
        label="Tên AC"
        value={a.title}
        onChange={(e) =>
          onChange({ ...a, title: e.target.value, status: "Draft" })
        }
      />
      <Select
        label="Cách nhập AC"
        value={a.format}
        onChange={(e) =>
          onChange({
            ...a,
            format: e.target.value as AcceptanceCriterion["format"],
          })
        }
      >
        <option>Condition/Outcome</option>
        <option>Given/When/Then</option>
      </Select>
      <Textarea
        label={
          a.format === "Given/When/Then"
            ? "Given / When — Điều kiện"
            : "Điều kiện áp dụng"
        }
        value={a.condition}
        onChange={(e) =>
          onChange({ ...a, condition: e.target.value, status: "Draft" })
        }
      />
      <Textarea
        label="Input / Context"
        value={a.input}
        onChange={(e) =>
          onChange({ ...a, input: e.target.value, status: "Draft" })
        }
      />
      <Textarea
        label={
          a.format === "Given/When/Then"
            ? "Then — Kết quả mong đợi"
            : "Kết quả mong đợi"
        }
        value={a.outcome}
        onChange={(e) =>
          onChange({ ...a, outcome: e.target.value, status: "Draft" })
        }
      />
      <Textarea
        label="Cách kiểm chứng kết quả"
        value={a.verification}
        onChange={(e) =>
          onChange({ ...a, verification: e.target.value, status: "Draft" })
        }
      />
      <h3>Scenario coverage</h3>
      {r.scenarios.map((s) => (
        <Checkbox
          key={s.id}
          label={s.title}
          checked={a.scenarioIds.includes(s.id)}
          onChange={() =>
            onChange({
              ...a,
              scenarioIds: a.scenarioIds.includes(s.id)
                ? a.scenarioIds.filter((id) => id !== s.id)
                : [...a.scenarioIds, s.id],
              status: "Draft",
            })
          }
        />
      ))}
      <details className="disclosure">
        <summary>Evidence hỗ trợ AC</summary>
        {c.discovery.evidence
          .filter((e) => e.status !== "Superseded")
          .map((e) => (
            <Checkbox
              key={e.id}
              label={`${e.statement} · ${e.status}`}
              checked={a.evidenceIds.includes(e.id)}
              onChange={() =>
                onChange({
                  ...a,
                  evidenceIds: a.evidenceIds.includes(e.id)
                    ? a.evidenceIds.filter((id) => id !== e.id)
                    : [...a.evidenceIds, e.id],
                  status: "Draft",
                })
              }
            />
          ))}
      </details>
      <Button variant="ghost" onClick={onDelete}>
        Xóa AC khỏi Draft
      </Button>
    </details>
  );
}
export function QualityWorkspace({ workCase: c }: { workCase: WorkCase }) {
  const { update } = useApp();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const l = layer2(c),
    summary = qualitySummary(c);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("Open"),
    [severity, setSeverity] = useState("All"),
    [error, setError] = useState(""),
    [reviewer, setReviewer] = useState(""),
    [basis, setBasis] = useState(""),
    [verdict, setVerdict] = useState<"Pass" | "Fail">("Pass");
  const scope = params.get("requirement");
  const scopeIds = l.requirements
    .filter((r) => r.status !== "Archived" && (!scope || r.id === scope))
    .map((r) => r.id);
  const all = l.results.filter((x) => scopeIds.includes(x.requirementId));
  const rows = all.filter(
    (x) =>
      (status === "All" || status === "Open"
        ? status === "All" ||
          x.status === "Fail" ||
          x.status === "Unknown" ||
          x.freshness === "Stale"
        : status === "Stale"
          ? x.freshness === "Stale"
          : x.status === status) &&
      (severity === "All" || x.severity === severity),
  );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(rows.length / 3) - 1),
  );
  const visible = rows.slice(currentPage * 3, currentPage * 3 + 3);
  const selected =
    l.results.find(
      (x) =>
        x.id === params.get("finding") && scopeIds.includes(x.requirementId),
    ) || visible[0];
  const req = l.requirements.find((r) => r.id === selected?.requirementId);
  const rule = qualityRules.find((x) => x.id === selected?.checkId);
  const previous = [...l.runs]
    .reverse()
    .filter((run) => run.results.some((x) => x.id === selected?.id))
    .slice(1)
    .flatMap((r) => r.results)
    .find((x) => x.id === selected?.id);
  const act = (command: Layer2Command) => {
    try {
      update(c.id, { type: "layer2", command });
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const correct = req
    ? `${casePath(c.id, "requirements")}?requirement=${req.id}&tab=${selected?.checkId.startsWith("AC-") || selected?.checkId === "REQ-QC-06" ? "ac" : "content"}&returnTo=${encodeURIComponent(location.pathname + location.search)}`
    : "";
  return (
    <div className="panel-stack">
      <div className="workbench-toolbar">
        <p>
          {summary.ready}/{summary.total} Quality Ready · {summary.open}{" "}
          Fail/Unknown · {summary.stale} Stale checks
        </p>
        <Button
          disabled={!scopeIds.length}
          onClick={() => act({ op: "validate", ids: scopeIds })}
        >
          {scope
            ? "Chạy lại scope Requirement"
            : "Chạy validation toàn bộ scope active"}
        </Button>
      </div>
      <div className="small muted">
        Rule {l.runs.at(-1)?.ruleVersion || "chưa chạy"} · Validation dùng nội
        dung đã lưu. Semantic judgment cần BA review; AI Semantic: Not Executed
        / Unavailable.
      </div>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <div className="l2-workbench quality-workbench">
        <aside className="l2-list quality-list">
          <Select
            label="Scope Quality Review"
            value={scope || ""}
            onChange={(e) => {
              const p = new URLSearchParams(params);
              p.delete("finding");
              if (e.target.value) p.set("requirement", e.target.value);
              else p.delete("requirement");
              setParams(p);
            }}
          >
            <option value="">Toàn bộ Requirement active</option>
            {l.requirements
              .filter((r) => r.status !== "Archived")
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
          </Select>
          <Select
            label="Lọc kết quả"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            {["Open", "Stale", "Fail", "Unknown", "Pass", "N/A", "All"].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </Select>
          <Select
            label="Mức ảnh hưởng"
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setPage(0);
            }}
          >
            {["All", "High", "Medium"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          {visible.map((x) => (
            <button
              key={x.id}
              className={`entity-row ${selected?.id === x.id ? "selected" : ""}`}
              onClick={() => {
                const p = new URLSearchParams(params);
                p.set("finding", x.id);
                setParams(p);
                setReviewer("");
                setBasis("");
              }}
            >
              <strong>
                {qualityRules.find((r) => r.id === x.checkId)?.criterion}
              </strong>
              <small>
                {l.requirements.find((r) => r.id === x.requirementId)?.title} ·{" "}
                {x.checkId}
              </small>
              <span>
                {x.status} · {x.freshness} · {x.severity}
              </span>
            </button>
          ))}
          {rows.length > 3 && (
            <div className="action-row">
              <Button
                variant="secondary"
                disabled={currentPage === 0}
                onClick={() => {
                  setPage(currentPage - 1);
                  const p = new URLSearchParams(params);
                  p.delete("finding");
                  setParams(p);
                }}
              >
                Trang trước
              </Button>
              <span>
                {currentPage * 3 + 1}–
                {Math.min(rows.length, currentPage * 3 + 3)} / {rows.length}
              </span>
              <Button
                variant="secondary"
                disabled={(currentPage + 1) * 3 >= rows.length}
                onClick={() => {
                  setPage(currentPage + 1);
                  const p = new URLSearchParams(params);
                  p.delete("finding");
                  setParams(p);
                }}
              >
                Trang sau
              </Button>
            </div>
          )}
          {!rows.length && (
            <p>
              {all.length
                ? "Không có kết quả trong bộ lọc."
                : "Chưa chạy validation trong scope này."}
            </p>
          )}
        </aside>
        <section className="l2-detail">
          {selected && req && rule ? (
            <>
              <div className="card-heading">
                <div>
                  <span className="small muted">
                    {req.title} · {selected.checkId}
                  </span>
                  <h3>{rule.criterion}</h3>
                </div>
                <Badge
                  tone={
                    selected.status === "Pass" &&
                    selected.freshness === "Current"
                      ? "sage"
                      : "warning"
                  }
                >
                  {selected.freshness === "Stale" ? "Stale" : selected.status}
                </Badge>
              </div>
              <p>{selected.explanation}</p>
              {selected.freshness === "Stale" && (
                <div className="inline-feedback">
                  <h3>Impact Details — cần kiểm tra lại</h3>
                  {selected.staleReasons.map((reason) => (
                    <p key={reason}>{reason}</p>
                  ))}
                  <p>
                    Kết quả {selected.status} dựa trên input v
                    {selected.inputVersion}; không dùng làm kết luận hiện tại.
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => act({ op: "validate", ids: [req.id] })}
                  >
                    Re-validate Requirement bị ảnh hưởng
                  </Button>
                </div>
              )}
              <p className="small muted">
                {reviewableChecks.includes(selected.checkId) &&
                selected.method === "Structured"
                  ? "Structured + BA review"
                  : selected.method}{" "}
                · {rule.layer} · rule {selected.ruleVersion} · input v
                {selected.inputVersion} · applicability {req.module}
              </p>
              <h3>
                {selected.status === "Pass" && selected.freshness === "Current"
                  ? "Criterion đã đạt"
                  : "BA cần làm"}
              </h3>
              <p>
                {selected.status === "Pass" && selected.freshness === "Current"
                  ? "Giữ căn cứ review; theo dõi thay đổi nguồn và các criterion còn mở trong scope."
                  : selected.action}
              </p>
              <Link className="btn btn-secondary" to={correct}>
                Mở đúng Requirement / AC để sửa
              </Link>
              <details className="disclosure">
                <summary>Dữ liệu và kết quả lần trước</summary>
                <p>
                  {previous
                    ? `${previous.status} · input v${previous.inputVersion}: ${previous.explanation}`
                    : "Chưa có lần kiểm tra trước cho criterion này."}
                </p>
                <p>{req.statement}</p>
                {req.ac.map((a) => (
                  <Link
                    className="trace-item"
                    key={a.id}
                    to={`${entityPath(c, "ac", a.id)}&returnTo=${encodeURIComponent(location.pathname + location.search)}`}
                  >
                    <strong>{a.title}</strong>
                    <span>
                      {a.condition} → {a.outcome}
                    </span>
                    <small>{a.id}</small>
                  </Link>
                ))}
              </details>
              {reviewableChecks.includes(rule.id) && (
                <details className="disclosure">
                  <summary>BA review criterion này</summary>
                  <p className="small muted">
                    Review có căn cứ trên input hiện tại; không override
                    structural blockers, unconfirmed sources hoặc conflict.
                    Không có waiver mandatory checkpoint.
                  </p>
                  <TextInput
                    label="BA reviewer"
                    value={reviewer}
                    onChange={(e) => setReviewer(e.target.value)}
                  />
                  <Textarea
                    label="Căn cứ đánh giá criterion"
                    value={basis}
                    onChange={(e) => setBasis(e.target.value)}
                  />
                  <Select
                    label="Kết quả BA review"
                    value={verdict}
                    onChange={(e) =>
                      setVerdict(e.target.value as "Pass" | "Fail")
                    }
                  >
                    <option>Pass</option>
                    <option>Fail</option>
                  </Select>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      act({
                        op: "review",
                        id: req.id,
                        checkId: rule.id,
                        status: verdict,
                        reviewer,
                        basis,
                      })
                    }
                  >
                    Ghi review — sau đó chạy lại validation
                  </Button>
                </details>
              )}
              <details className="disclosure">
                <summary>Traceability — nguồn / AC / finding</summary>
                <TraceabilityPanel
                  workCase={c}
                  kind="finding"
                  id={selected.id}
                />
              </details>
            </>
          ) : (
            <>
              <h3>Quality Review</h3>
              <p>
                Chạy validation để thấy criterion áp dụng, reasons và đối tượng
                cần sửa. Không có kết quả hardcoded.
              </p>
            </>
          )}
          <details className="disclosure">
            <summary>Checklist / applicability / evaluation method</summary>
            {qualityRules.map((r) => (
              <section key={r.id}>
                <h3>
                  {r.id} — {r.criterion}
                </h3>
                <p className="small muted">
                  {r.method} · {r.layer} · {r.requiredInputs} · {r.version}
                </p>
              </section>
            ))}
          </details>
          <details className="disclosure">
            <summary>Validation run history ({l.runs.length})</summary>
            {[...l.runs].reverse().map((run) => (
              <p key={run.id}>
                {run.id} · {run.date} · input v{run.inputVersion} ·{" "}
                {run.results.filter((x) => x.status === "Fail").length} Fail /{" "}
                {run.results.filter((x) => x.status === "Unknown").length}{" "}
                Unknown /{" "}
                {run.results.filter((x) => x.status === "Pass").length} Pass /{" "}
                {run.results.filter((x) => x.status === "N/A").length} N/A
              </p>
            ))}
          </details>
        </section>
      </div>
    </div>
  );
}

function SplitDialog({
  workCase: c,
  requirement: r,
  onClose,
}: {
  workCase: WorkCase;
  requirement: Requirement;
  onClose: () => void;
}) {
  const { update } = useApp();
  const [children, setChildren] = useState([
    {
      title: "",
      statement: "",
      acIds: [] as string[],
      evidenceIds: [] as string[],
    },
    {
      title: "",
      statement: "",
      acIds: [] as string[],
      evidenceIds: [] as string[],
    },
  ]);
  const [error, setError] = useState("");
  return (
    <Modal
      open
      title="Phân tách Requirement"
      description="Mỗi AC gốc phải được phân bổ một lần; mọi Evidence phải được giữ ở ít nhất một child. Parent sẽ archive để không trùng active behavior. Question và dependency links được giữ, cần BA review lại."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={() => {
              try {
                update(c.id, {
                  type: "layer2",
                  command: { op: "split", id: r.id, children },
                });
                onClose();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Xác nhận phân tách và archive parent
          </Button>
        </>
      }
    >
      {children.map((child, index) => (
        <section className="panel-stack" key={index}>
          <h3>Requirement con {index + 1}</h3>
          <TextInput
            label={`Tên behavior ${index + 1}`}
            value={child.title}
            onChange={(e) =>
              setChildren(
                children.map((x, i) =>
                  i === index ? { ...x, title: e.target.value } : x,
                ),
              )
            }
          />
          <Textarea
            label={`Statement behavior ${index + 1}`}
            value={child.statement}
            onChange={(e) =>
              setChildren(
                children.map((x, i) =>
                  i === index ? { ...x, statement: e.target.value } : x,
                ),
              )
            }
          />
          {r.ac.map((a) => (
            <Checkbox
              key={a.id}
              label={`${a.title} → child ${index + 1}`}
              checked={child.acIds.includes(a.id)}
              onChange={() =>
                setChildren(
                  children.map((x, i) =>
                    i === index
                      ? {
                          ...x,
                          acIds: x.acIds.includes(a.id)
                            ? x.acIds.filter((id) => id !== a.id)
                            : [...x.acIds, a.id],
                        }
                      : { ...x, acIds: x.acIds.filter((id) => id !== a.id) },
                  ),
                )
              }
            />
          ))}
          {r.evidenceIds.map((id) => (
            <Checkbox
              key={id}
              label={`${c.discovery.evidence.find((e) => e.id === id)?.statement || id} → child ${index + 1}`}
              checked={child.evidenceIds.includes(id)}
              onChange={() =>
                setChildren(
                  children.map((x, i) =>
                    i === index
                      ? {
                          ...x,
                          evidenceIds: x.evidenceIds.includes(id)
                            ? x.evidenceIds.filter((value) => value !== id)
                            : [...x.evidenceIds, id],
                        }
                      : x,
                  ),
                )
              }
            />
          ))}
        </section>
      ))}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </Modal>
  );
}
