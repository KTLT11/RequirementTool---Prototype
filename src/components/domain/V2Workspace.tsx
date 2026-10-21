import { MoreVertical, Trash2 } from "lucide-react";
import { FormationDialog } from "./RequirementWorkspace";
import {
  layer2,
  qualitySummary,
  requirementQuality,
} from "../../services/requirementService";
import {
  devReadiness,
  defaultDocumentScope,
} from "../../services/documentService";
import { TraceabilityPanel, entityPath } from "./TraceabilityPanel";
import { sceneForStage } from "../../services/uxService";
import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import type {
  WorkCase,
  Stage,
  Evidence,
  DevReviewOutcome,
} from "../../types/case";
import type { SourceDocument } from "../../types/ux";
import { useApp } from "../../context/AppContext";
import {
  Button,
  Card,
  Badge,
  Select,
  Textarea,
  TextInput,
} from "../ui/primitives";
import { Drawer, Modal } from "../ui/Overlay";
import { CustomerReviewWorkspace } from "./CustomerConfirmationWorkspace";
import { DocumentExperience } from "./DocumentExperience";
import { SectionSwitcher } from "../ui/SectionSwitcher";
import { StatusBadge, StatusColumn } from "../ui/StatusBadge";
import { DiscoveryQuestionAssist } from './DemoAssistance';
import { ReviewableTextarea } from '../ui/ContentAssist';
import { ux } from "../../services/uxService";
import {
  authorized,
  contextReady,
  discoveryReady,
  discoveryChecks,
} from "../../services/discoveryService";
import { questions } from "../../data/questions";
import { stageLabels, stageOrder } from "../../data/cases";
import { casePath } from "../../app/navigation";
import { workflowDetails } from "../../services/previewService";
import { DiscoveryPanel } from "./DiscoveryPanel";

const stageRoute: Record<Stage, string> = {
  incoming: "sources",
  context: "context",
  discovery: "discovery",
  formation: "requirements",
  customer: "customer",
  readiness: "handoff",
  handoff: "handoff",
};
const stageShort: Record<Stage, string> = {
  incoming: "Request",
  context: "Context",
  discovery: "Discovery",
  formation: "Requirements & Quality",
  customer: "Customer",
  readiness: "Readiness",
  handoff: "Handoff",
};
export function OverviewV2({ workCase: c }: { workCase: WorkCase }) {
  const [selected, setSelected] = useState<Stage>(c.currentStage);
  useEffect(() => setSelected(c.currentStage), [c.id, c.currentStage]);
  const gap =
    c.discovery.gaps.find(
      (g) => g.type === "Conflict" && g.status !== "Resolved",
    ) ?? c.discovery.gaps.find((g) => g.status !== "Resolved");
  const d = workflowDetails(c, selected);
  const quality = qualitySummary(c);
  const l2Issue =
    layer2(c).results.find((x) => x.freshness === "Stale") ??
    layer2(c).results.find((x) => x.status === "Fail");
  const prioritizeLayer2 = c.currentStage === "formation" && !!l2Issue;
  const task = prioritizeLayer2
    ? l2Issue?.freshness === "Stale"
      ? "Kiểm tra lại chất lượng sau thay đổi nguồn"
      : "Sửa finding Requirement / AC đang chặn chất lượng"
    : gap
      ? gap.type === "Conflict"
        ? "Xác minh hai nguồn về thời hạn hoàn tiền"
        : "Bổ sung thông tin Discovery còn thiếu"
      : !contextReady(c)
        ? "Review bối cảnh và hướng Discovery"
        : "Xem requirement và các điều kiện chất lượng";
  const action = prioritizeLayer2
    ? "Mở finding cần xử lý"
    : gap
      ? gap.type === "Conflict"
        ? "Xem và xử lý mâu thuẫn"
        : "Mở thông tin cần bổ sung"
      : !contextReady(c)
        ? "Review Context Analysis"
        : "Mở Requirement Workspace";
  return (
    <div className="panel-stack">
      <div className="current-task">
        <div>
          <span className="eyebrow">CÔNG VIỆC CẦN XỬ LÝ</span>
          <h2>{task}</h2>
          <p>
            {(prioritizeLayer2 ? l2Issue?.explanation : gap?.description) ??
              "Kiểm tra nguồn và điều kiện trước khi chuyển bước."}
          </p>
          <p className="small muted">
            {prioritizeLayer2
              ? `${l2Issue?.requirementId} · ${l2Issue?.checkId} · ${l2Issue?.freshness}`
              : gap
                ? `${gap.evidenceIds.length} nguồn liên quan · ${gap.status}. Không tự chọn một quyết định khi chưa có căn cứ.`
                : "Business stage chỉ chuyển khi BA thực hiện action phù hợp."}
          </p>
        </div>
        <Link
          className="btn btn-primary"
          to={
            prioritizeLayer2
              ? entityPath(c, "finding", l2Issue!.id)
              : gap
                ? entityPath(c, "gap", gap.id)
                : casePath(c.id, !contextReady(c) ? "context" : "requirements")
          }
        >
          {action}
        </Link>
      </div>
      <div className="l2-overview">
        <strong>Requirements: {quality.total}</strong>
        <span>Quality Ready: {quality.ready}</span>
        <Link to={casePath(c.id, "quality")}>
          Findings: {quality.open} · Stale: {quality.stale} · Chưa chạy:{" "}
          {
            layer2(c).requirements.filter(
              (r) =>
                r.status !== "Archived" &&
                requirementQuality(c, r.id) === "Not Executed",
            ).length
          }{" "}
          →
        </Link>
      </div>
      <Card>
        <div className="card-heading">
          <h3>Hành trình xử lý Case</h3>
          <span className="small muted">
            Chọn để xem bước · không đổi business stage
          </span>
        </div>
        <nav className="progress-rail" aria-label="Workflow stages">
          {stageOrder.map((s, i) => (
            <button
              key={s}
              type="button"
              aria-pressed={selected === s}
              className={selected === s ? "selected" : ""}
              onClick={() => setSelected(s)}
            >
              <span>{i + 1}</span>
              <strong>{stageShort[s]}</strong>
              <small>
                {s === c.currentStage
                  ? "Current"
                  : s === "formation"
                    ? `${quality.ready}/${quality.total} Quality Ready`
                    : i >= 4
                      ? "Preview"
                      : s === "incoming"
                        ? "Đã nhận request"
                        : s === "context"
                          ? contextReady(c)
                            ? "Context Ready"
                            : "Cần review"
                          : discoveryReady(c)
                            ? "Info complete"
                            : "Open gaps"}
              </small>
            </button>
          ))}
        </nav>
        <div className="workflow-summary-grid">
          <section>
            <h3>{stageLabels[selected]}</h3>
            <Badge>
              {stageOrder.indexOf(selected) >= 4
                ? "Preview Only"
                : "Implemented"}
            </Badge>
            <p>{d.output}</p>
            <Link
              className="text-link"
              to={`${casePath(c.id, stageRoute[selected] as import("../../app/navigation").SectionSlug)}?stage=${selected}`}
            >
              Mở đúng workspace của bước này →
            </Link>
          </section>
          <section>
            <h3>BA cần làm</h3>
            <p>{d.action}</p>
            <h3>Điều kiện / bước tiếp</h3>
            <p>{d.next}</p>
          </section>
          <details className="disclosure">
            <summary>Input & System Processing</summary>
            <p>{d.input}</p>
            <p>{d.processing}</p>
          </details>
        </div>
      </Card>
      <nav className="quick-access" aria-label="Quick access">
        <Link
          to={casePath(
            c.id,
            "sources" as import("../../app/navigation").SectionSlug,
          )}
        >
          <strong>Request & Sources</strong>
          <span>Yêu cầu gốc, tài liệu và thông tin trích xuất</span>
        </Link>
        <Link to={`${casePath(c.id, "evidence")}?view=gaps`}>
          <strong>Discovery & Open Gaps</strong>
          <span>
            {c.discovery.gaps.filter((g) => g.status !== "Resolved").length}{" "}
            thông tin còn mở
          </span>
        </Link>
        <Link to={casePath(c.id, "requirements")}>
          <strong>Requirements / Output</strong>
          <span>Đọc nội dung, AC và nguồn hỗ trợ</span>
        </Link>
      </nav>
    </div>
  );
}
export function RequestSources({
  workCase: c,
  onEdit,
}: {
  workCase: WorkCase;
  onEdit: () => void;
}) {
  const { update } = useApp();
  const [params, setParams] = useSearchParams();
  const u = ux(c);
  const [error, setError] = useState(""),
    [formation, setFormation] = useState(false);
  const [review, setReview] = useState<string | null>(null),
    [interpretation, setInterpretation] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const doc =
    u.documents.find((d) => d.id === params.get("document")) ?? u.documents[0];
  const item = u.extracted.find((i) => i.id === review);
  const [qid, setQid] = useState("RULE-Q-06");
  useEffect(() => {
    const id = params.get("extracted");
    const found = u.extracted.find((i) => i.id === id);
    setReview(found?.id ?? null);
    if (found) {
      setInterpretation(found.interpretation);
      setQid(found.questionId);
    }
  }, [params.get("extracted"), c.id]);
  const closeReview = () => {
    setReview(null);
    const next = new URLSearchParams(params);
    next.delete("extracted");
    setParams(next, { replace: true });
  };
  const run = (f: () => void) => {
    try {
      f();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const importFile = async (file: File) => {
    try {
      const textType = /\.(txt|md|csv)$/i.test(file.name);
      const text = textType ? (await file.text()).slice(0, 100000) : "";
      const d: SourceDocument = {
        id: `DOC-${crypto.randomUUID()}`,
        name: file.name,
        type: file.name.split(".").at(-1)?.toUpperCase() ?? "FILE",
        source: "BA uploaded · chưa xác minh nguồn",
        sourceId: "",
        status: textType ? "Text loaded" : "Metadata only",
        text,
        uploadedAt: new Date().toISOString(),
      };
      update(c.id, { type: "ux", command: { op: "document", document: d } });
      setParams({ document: d.id });
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="panel-stack">
      <div className="source-toolbar">
        <div>
          <h3>Nguồn thông tin của Case</h3>
          <p className="muted">
            Tiếp nhận → xem nguồn → review diễn giải → liên kết Discovery /
            Evidence.
          </p>
        </div>
        <label className="btn btn-primary file-action">
          Thêm tài liệu
          <input
            type="file"
            aria-label="Thêm tài liệu khách hàng"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importFile(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <p className="small muted">
        TXT/MD/CSV: xem tối đa 100.000 ký tự đầu. PDF/DOCX và loại khác: lưu
        metadata, chưa đọc nội dung. Extraction bên dưới chỉ thuộc tài liệu demo
        định sẵn.
      </p>
      <div className="source-grid">
        <Card>
          <div className="card-heading">
            <h3>Incoming Request</h3>
            <Button variant="ghost" size="small" onClick={onEdit}>
              Chỉnh sửa request
            </Button>
          </div>
          <div className="card-content">
            <p>{c.incomingRequest}</p>
            <span className="provenance">
              Original Incoming Request · BA tiếp nhận
            </span>
            <Link
              className="text-link"
              to={casePath(
                c.id,
                "context" as import("../../app/navigation").SectionSlug,
              )}
            >
              Xem Context Analysis →
            </Link>
          </div>
        </Card>
        <Card>
          <div className="card-heading">
            <h3>Customer Documents ({u.documents.length})</h3>
          </div>
          <div className="source-list">
            {u.documents.map((d) => (
              <div key={d.id} className="entity-row-wrap">
                <button
                  className={
                    params.get("document") === d.id
                      ? "selected entity-row"
                      : "entity-row"
                  }
                  onClick={() => setParams({ document: d.id })}
                >
                  <strong>{d.name}</strong>
                  <span>
                    {d.type} · {d.status}
                  </span>
                  <small>{d.source}</small>
                </button>
                <details className="dropdown">
                  <summary
                    className="btn btn-ghost btn-small"
                    aria-label={`Thao tác với ${d.name}`}
                  >
                    <MoreVertical size={16} />
                  </summary>
                  <div className="dropdown-menu" role="menu">
                    <button
                      role="menuitem"
                      className="dropdown-item danger"
                      onClick={(e) => {
                        e.currentTarget
                          .closest("details")
                          ?.removeAttribute("open");
                        setDeleteTarget(d.id);
                      }}
                    >
                      <Trash2 size={14} /> Xóa tài liệu
                    </button>
                  </div>
                </details>
              </div>
            ))}
            {!u.documents.length && (
              <p className="card-content muted">
                Chưa có tài liệu. Thêm nguồn hoặc nhập request thủ công.
              </p>
            )}
          </div>
        </Card>
      </div>
      {doc && params.get("document") && (
        <Card>
          <div className="card-heading">
            <h3>{doc.name}</h3>
            <Badge>{doc.status}</Badge>
          </div>
          <div className="card-content">
            <p className="preserve-lines">
              {doc.text ||
                "Chưa hỗ trợ đọc nội dung file này. Metadata đã được lưu; bạn có thể bổ sung thông tin thủ công trong Discovery."}
            </p>
            <p className="provenance">
              {doc.source} · {doc.id}
            </p>
            {doc.uploadedAt && (
              <p className="small muted">
                Nhận lúc{" "}
                {new Date(doc.uploadedAt).toLocaleString("vi-VN", {
                  timeZone: "Australia/Brisbane",
                })}
              </p>
            )}
          </div>
        </Card>
      )}
      <Card>
        <div className="card-heading">
          <div>
            <h3>Extracted Information Review</h3>
            <p>
              Simulated extraction · Accept diễn giải không phải Evidence
              Confirmed.
            </p>
          </div>
          <Badge>Simulated</Badge>
        </div>
        <div className="extraction-list">
          {u.extracted.map((i) => (
            <article
              key={i.id}
              className={
                params.get("extracted") === i.id
                  ? "selected extraction-item"
                  : "extraction-item"
              }
            >
              <strong>{i.value}</strong>
              <span className="small muted">
                {u.documents.find((d) => d.id === i.documentId)?.name}
              </span>
              <p>{i.interpretation}</p>
              <Badge tone={i.status === "Rejected" ? "warning" : "neutral"}>
                {i.status}
              </Badge>
              <div className="action-row">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => {
                    setParams({ extracted: i.id, document: i.documentId });
                    setReview(i.id);
                    setInterpretation(i.interpretation);
                    setQid(i.questionId);
                  }}
                >
                  Review diễn giải
                </Button>
                <Link
                  className="text-link"
                  to={entityPath(c, "document", i.documentId)}
                >
                  Xem nguồn
                </Link>
              </div>
              {i.evidenceId && (
                <Link
                  className="text-link"
                  to={entityPath(c, "evidence", i.evidenceId)}
                >
                  Evidence liên quan →
                </Link>
              )}
            </article>
          ))}
          {!u.extracted.length && (
            <p className="card-content muted">
              Chưa có extraction đề xuất. File tải lên không được tự phân tích
              hoặc xác nhận.
            </p>
          )}
        </div>
      </Card>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <Drawer
        open={!!item}
        title="Review nội dung từ tài liệu"
        description={item?.id}
        onClose={closeReview}
        footer={
          <Button variant="secondary" onClick={closeReview}>
            Đóng
          </Button>
        }
      >
        {item && (
          <div className="form-stack">
            <p className="provenance">
              Simulated suggestion · {item.reference}
            </p>
            <blockquote className="source-excerpt">{item.excerpt}</blockquote>
            <Textarea
              label="Diễn giải để BA review"
              value={interpretation}
              onChange={(e) => setInterpretation(e.target.value)}
            />
            <div className="action-row">
              <Button
                onClick={() =>
                  run(() =>
                    update(c.id, {
                      type: "ux",
                      command: {
                        op: "extracted",
                        id: item.id,
                        status: "Accepted",
                        interpretation,
                      },
                    }),
                  )
                }
              >
                Chấp nhận diễn giải
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  run(() =>
                    update(c.id, {
                      type: "ux",
                      command: {
                        op: "extracted",
                        id: item.id,
                        status: "Rejected",
                        interpretation,
                      },
                    }),
                  )
                }
              >
                Không sử dụng
              </Button>
            </div>
            <Badge>{item.status} · chưa Confirmed</Badge>
            <Select
              label="Liên kết tới Discovery Question"
              value={qid}
              onChange={(e) => setQid(e.target.value)}
            >
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.question}
                </option>
              ))}
            </Select>
            <Button
              variant="secondary"
              disabled={item.status !== "Accepted" || !!item.evidenceId}
              onClick={() =>
                run(() =>
                  update(c.id, {
                    type: "ux",
                    command: { op: "link", id: item.id, questionId: qid },
                  }),
                )
              }
            >
              Tạo Evidence chờ review và liên kết câu hỏi
            </Button>
            {item.status !== "Accepted" && (
              <p className="small muted">
                Chấp nhận hoặc điều chỉnh diễn giải trước khi liên kết.
              </p>
            )}
            {item.evidenceId && (
              <Link
                className="text-link"
                to={entityPath(c, "question", item.questionId)}
              >
                Mở câu hỏi đã liên kết →
              </Link>
            )}
            <TraceabilityPanel workCase={c} kind="extracted" id={item.id} />
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
          </div>
        )}
      </Drawer>
      <Modal
        open={!!deleteTarget}
        title="Xóa tài liệu"
        description={u.documents.find((d) => d.id === deleteTarget)?.name}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError("");
        }}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError("");
              }}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                try {
                  update(c.id, {
                    type: "ux",
                    command: { op: "deleteDocument", id: deleteTarget! },
                  });
                  if (params.get("document") === deleteTarget) {
                    const next = new URLSearchParams(params);
                    next.delete("document");
                    setParams(next, { replace: true });
                  }
                  setDeleteTarget(null);
                  setDeleteError("");
                } catch (e) {
                  setDeleteError((e as Error).message);
                }
              }}
            >
              Xóa
            </Button>
          </>
        }
      >
        <p>
          Thao tác này xóa tài liệu và các extraction chưa liên kết Evidence.
          Không thể hoàn tác.
        </p>
        {deleteError && (
          <p role="alert" className="field-error">
            {deleteError}
          </p>
        )}
      </Modal>
    </div>
  );
}
export function EvidenceReview({
  workCase: c,
  evidence: e,
}: {
  workCase: WorkCase;
  evidence: Evidence;
}) {
  const { update } = useApp();
  const [basis, setBasis] = useState(e.basis),
    [error, setError] = useState("");
  const run = (f: () => void) => {
    try {
      f();
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const eligible = authorized(c, e, e.sourceId);
  return (
    <div className="form-stack">
      <blockquote className="source-excerpt">{e.statement}</blockquote>
      <p>
        {c.discovery.stakeholders.find((s) => s.id === e.sourceId)?.name ??
          "Chưa xác định nguồn"}{" "}
        · {e.provenance}
      </p>
      <div className="badge-group">
        <StatusBadge
          category="evidence-review"
          status={e.review}
          showCategory
        />
        <StatusBadge
          category="evidence-confidence"
          status={e.status}
          showCategory
        />
      </div>
      <p className="small muted">
        Review là kiểm tra thông tin. Confirmed cần căn cứ và người có thẩm
        quyền; không phải Customer xác nhận CRD.
      </p>
      {e.review !== "Reviewed" ? (
        <Button
          onClick={() =>
            run(() =>
              update(c.id, {
                type: "review",
                evidenceId: e.id,
                review: "Reviewed",
              }),
            )
          }
        >
          Ghi nhận đã review nguồn này
        </Button>
      ) : (
        <>
          <Textarea
            label="Căn cứ xác minh thông tin"
            value={basis}
            onChange={(ev) => setBasis(ev.target.value)}
          />
          <Button
            disabled={!basis.trim() || !eligible || e.status === "Superseded"}
            onClick={() =>
              run(() =>
                update(c.id, {
                  type: "confirm",
                  evidenceId: e.id,
                  authorityId: e.sourceId,
                  basis,
                }),
              )
            }
          >
            Xác minh Evidence với căn cứ
          </Button>
          {!eligible && (
            <p className="field-hint">
              Nguồn này chưa có authority cho nhóm thông tin. Cần nguồn có thẩm
              quyền phù hợp, không tự xác nhận thay.
            </p>
          )}
        </>
      )}
      <Button
        variant="ghost"
        onClick={() =>
          run(() =>
            update(c.id, {
              type: "review",
              evidenceId: e.id,
              review: "Needs Clarification",
            }),
          )
        }
      >
        Nguồn cần làm rõ thêm
      </Button>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <TraceabilityPanel workCase={c} kind="evidence" id={e.id} />
    </div>
  );
}
export function ConnectedDiscovery({ workCase: c }: { workCase: WorkCase }) {
  const { update } = useApp();
  const [params, setParams] = useSearchParams();
  const selected =
    questions.find((q) => q.id === params.get("question")) ?? questions[0];
  const module = params.get("module") ?? selected.module;
  const u = ux(c),
    r = c.discovery.responses.find((r) => r.questionId === selected.id)!;
  const draft = u.drafts[selected.id] ?? { text: r.text, source: r.source };
  const gap = c.discovery.gaps.find((g) => g.questionId === selected.id);
  const evidence = c.discovery.evidence.filter(
    (e) => e.questionId === selected.id && e.status !== "Superseded",
  );
  const [formation, setFormation] = useState(false);
  const [review, setReview] = useState<string | null>(null),
    [error, setError] = useState(""),
    [saved, setSaved] = useState("");
  const e = c.discovery.evidence.find((e) => e.id === review);
  const change = (text: string, source: string) =>
    update(c.id, {
      type: "ux",
      command: { op: "draft", questionId: selected.id, text, source },
    });
  if (["patterns", "checkpoint"].includes(params.get("view") ?? ""))
    return (
      <div className="v2-secondary">
        <DiscoveryPanel workCase={c} />
      </div>
    );
  return (
    <div className="panel-stack">
      <div className="workbench-toolbar">
        <p className="muted">
          Draft được giữ khi đổi question, module hoặc workspace. Lưu response
          để tạo Evidence chờ review.
        </p>
        <Link
          className="btn btn-secondary"
          to={`${casePath(c.id, "discovery")}?view=checkpoint`}
        >
          Kiểm tra thông tin còn thiếu
        </Link>
        <Link
          className="text-link"
          to={`${casePath(c.id, "discovery")}?view=patterns`}
        >
          Review modules
        </Link>
      </div>
      <div className="discovery-workbench">
        <nav aria-label="Discovery modules" className="module-rail">
          {["Core", "Process", "Business Rule", "Integration", "Exception"].map(
            (m) => (
              <button
                key={m}
                className={module === m ? "selected" : ""}
                onClick={() => {
                  const q = questions.find((q) => q.module === m)!;
                  setParams({ module: m, question: q.id });
                }}
              >
                {m}
                <span>{questions.filter((q) => q.module === m).length}</span>
              </button>
            ),
          )}
          <p className="small muted">
            Scope demo hoàn tiền: 8 câu hỏi. Data/Permission/NFR chưa được kích
            hoạt trong scope này.
          </p>
        </nav>
        <div className="question-rail">
          <h3>Questions & Required Information</h3>
          {questions
            .filter((q) => q.module === module)
            .map((q) => {
              const g = c.discovery.gaps.find((g) => g.questionId === q.id);
              return (
                <button
                  key={q.id}
                  className={
                    q.id === selected.id ? "selected entity-row" : "entity-row"
                  }
                  onClick={() => {
                    setSaved("");
                    setParams({ module: q.module, question: q.id });
                  }}
                >
                  <strong>{q.question}</strong>
                  <small>
                    {q.id} · {q.infoId}
                  </small>
                  <span>
                    {g?.status ?? "Chưa kiểm tra"}
                    {g?.type === "Conflict" ? " · Conflict ưu tiên cao" : ""}
                    {u.drafts[q.id] ? " · Draft" : ""}
                  </span>
                </button>
              );
            })}
        </div>
        <section className="question-working">
          <div>
            <span className="provenance">
              {selected.id} · {selected.infoId}
            </span>
            <h3>{selected.question}</h3>
            <p className="muted">{selected.why}</p>
          </div>
          <Badge tone={gap?.status === "Resolved" ? "sage" : "warning"}>
            {gap?.status ?? "Open"}
          </Badge>
          <p className="small">
            {gap?.status === "Resolved"
              ? "Thông tin đã có Evidence xác minh."
              : `Cần bổ sung: ${!draft.text.trim() ? "response và nguồn" : !draft.source ? "nguồn thông tin" : "review / căn cứ xác minh Evidence"}${gap?.type === "Conflict" ? "; quyết định có authority cho mâu thuẫn" : ""}.`}
          </p>
          <DiscoveryQuestionAssist key={selected.id} workCase={c} questionId={selected.id} />
          <ReviewableTextarea
            key={`${selected.id}:response`}
            label="Response đang làm việc"
            rows={4}
            value={draft.text}
            onChange={(value) => change(value, draft.source)}
          />
          <Select
            label="Nguồn cung cấp thông tin"
            value={draft.source}
            onChange={(ev) => change(draft.text, ev.target.value)}
          >
            <option value="">Chưa xác định nguồn</option>
            {c.discovery.stakeholders.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.role}
              </option>
            ))}
          </Select>
          <div className="action-row">
            <Button
              disabled={!u.drafts[selected.id]}
              onClick={() => {
                try {
                  update(c.id, {
                    type: "ux",
                    command: { op: "save", questionId: selected.id },
                  });
                  setSaved(
                    "Response đã lưu. Evidence mới Pending Review / Unconfirmed; Gap chưa tự được đóng.",
                  );
                  setError("");
                } catch (err) {
                  setError((err as Error).message);
                }
              }}
            >
              Lưu response của câu hỏi này
            </Button>
            <span className="small muted">
              {u.drafts[selected.id]
                ? "Draft đã giữ trên trình duyệt"
                : "Không có thay đổi chưa lưu"}
            </span>
          </div>
          {saved && (
            <p className="inline-feedback" role="status">
              {saved}
            </p>
          )}
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <Button variant="secondary" onClick={() => setFormation(true)}>
            Tạo Requirement từ Discovery này
          </Button>
          <h3>Evidence liên quan ({evidence.length})</h3>
          {evidence.map((e) => (
            <button
              key={e.id}
              className="entity-row"
              onClick={() => setReview(e.id)}
            >
              <strong>{e.statement}</strong>
              <span>
                {e.review} · {e.status}
              </span>
            </button>
          ))}
          {gap && (
            <Link className="text-link" to={entityPath(c, "gap", gap.id)}>
              Xử lý {gap.type === "Conflict" ? "mâu thuẫn" : "Gap"} trong ngữ
              cảnh câu hỏi →
            </Link>
          )}
          <details className="disclosure">
            <summary>
              Traceability — nguồn và nội dung sử dụng thông tin này
            </summary>
            <TraceabilityPanel workCase={c} kind="question" id={selected.id} />
          </details>
        </section>
      </div>
      {formation && (
        <FormationDialog
          workCase={c}
          questionId={selected.id}
          onClose={() => setFormation(false)}
        />
      )}
      <Drawer
        open={!!e}
        title="Review nguồn của câu hỏi"
        description={e?.id}
        onClose={() => setReview(null)}
      >
        {e && <EvidenceReview key={e.id} workCase={c} evidence={e} />}
      </Drawer>
    </div>
  );
}
function DevReadinessPanel({ workCase: c }: { workCase: WorkCase }) {
  const [taskParams] = useSearchParams();
  const scope = taskParams.get("scope")
    ? defaultDocumentScope(c).filter((id) => id === taskParams.get("scope"))
    : c.confirmation.scopeReqIds.length
      ? c.confirmation.scopeReqIds
      : defaultDocumentScope(c);
  const result = devReadiness(c, scope);
  return (
    <section>
      <h3>Dev Readiness</h3>
      <p>
        Scope: {scope.join(", ") || "Chưa có Requirement."} · source v
        {c.version}
      </p>
      <StatusBadge category="dev-readiness" status={result.status} />
      {result.reasons.length > 0 && (
        <ul>
          {result.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
      <p className="small muted">
        Ready yêu cầu đồng thời: tất cả Requirement trong scope Quality Ready,
        Customer Confirmation bao phủ scope, không còn Gap mở hoặc dependency
        ngoài scope chưa Quality Ready.
      </p>
    </section>
  );
}
function DevReviewPanel({ workCase: c }: { workCase: WorkCase }) {
  const { update } = useApp();
  const confirmedScope = c.confirmation.scopeReqIds;
  const canReview =
    (c.confirmation.outcome === "Confirmed" ||
      c.confirmation.outcome === "Partially Confirmed") &&
    confirmedScope.length > 0;
  const [outcome, setOutcome] = useState<DevReviewOutcome>("Accepted");
  const [reviewer, setReviewer] = useState(c.devReview.reviewer);
  const [basis, setBasis] = useState("");
  const [blockers, setBlockers] = useState("");
  const [error, setError] = useState("");
  return (
    <section>
      <h3>Dev Review & Handoff</h3>
      <p>
        Hiện tại: <strong>{c.devReview.outcome}</strong>
        {c.devReview.scopeReqIds.length
          ? ` · scope ${c.devReview.scopeReqIds.join(", ")}`
          : ""}
        {c.devReview.date
          ? ` · ${new Date(c.devReview.date).toLocaleString()}`
          : ""}
      </p>
      {!canReview && (
        <p className="field-error">
          Dev Review chỉ áp dụng sau khi Customer Confirmation = Confirmed hoặc
          Partially Confirmed cho scope tương ứng.
        </p>
      )}
      <Select
        label="Outcome"
        value={outcome}
        onChange={(e) => setOutcome(e.target.value as DevReviewOutcome)}
      >
        <option>Accepted</option>
        <option>Accepted with Blocker</option>
        <option>Changes Requested</option>
      </Select>
      <TextInput
        label="Reviewer"
        value={reviewer}
        onChange={(e) => setReviewer(e.target.value)}
      />
      <Textarea
        label="Basis"
        value={basis}
        onChange={(e) => setBasis(e.target.value)}
      />
      {outcome === "Accepted with Blocker" && (
        <Textarea
          label="Blockers"
          value={blockers}
          onChange={(e) => setBlockers(e.target.value)}
        />
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <Button
        disabled={!canReview}
        onClick={() => {
          try {
            update(c.id, {
              type: "devReview",
              scopeReqIds: confirmedScope,
              outcome,
              reviewer,
              basis,
              blockers,
            });
            setError("");
            setBasis("");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        Ghi nhận Dev Review
      </Button>
      <p className="small muted">
        Accepted with Blocker không phải Implementation Unblocked. Dev Review
        không thay Customer Confirmation.
      </p>
    </section>
  );
}
export function ConfirmationHandoff({
  workCase: c,
  handoff = false,
}: {
  workCase: WorkCase;
  handoff?: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const view = params.get("stage") ?? (handoff ? "readiness" : "customer");
  const activeTotal = qualitySummary(c).total;
  const scope = params.get("scope")
    ? defaultDocumentScope(c).filter((id) => id === params.get("scope"))
    : c.confirmation.scopeReqIds.length
      ? c.confirmation.scopeReqIds
      : defaultDocumentScope(c);
  if (!activeTotal)
    return (
      <Card>
        <div className="card-content">
          <h3>Chưa có Requirement nào để xác nhận/bàn giao</h3>
          <p>
            Tạo và validate Requirement ở Layer 2 trước khi dùng Customer
            Confirmation/Dev Readiness.
          </p>
          <Link className="text-link" to={casePath(c.id, "requirements")}>
            Mở Requirements
          </Link>
        </div>
      </Card>
    );
  return (
    <div className="panel-stack">
      {handoff && (
        <SectionSwitcher
          label="Readiness & Handoff"
          value={view}
          onChange={(v) => {
            const next = new URLSearchParams(params);
            next.set("stage", v);
            setParams(next);
          }}
          items={[
            { value: "readiness", label: "Dev Readiness" },
            { value: "handoff", label: "CRD/DRD & Dev Handoff" },
          ]}
        />
      )}
      {handoff ? (
        <div className="confirmation-workspace">
          <details className="disclosure confirmation-helper">
            <summary>Phân biệt các lớp review</summary>
            <ul>
              <li>Evidence: xác minh nguồn và căn cứ.</li>
              <li>Requirement: review nội dung và AC (BA Review).</li>
              <li>
                Customer: xác nhận scope/baseline đã gửi (Customer
                Confirmation).
              </li>
              <li>
                Dev: tiếp nhận package cùng scope/baseline (Dev
                Review/Acceptance).
              </li>
            </ul>
            <p className="small muted">
              BA Review ≠ Customer Confirmation ≠ Quality Ready ≠ Dev
              Acceptance.
            </p>
          </details>
          {view === "readiness" ? (
            <DevReadinessPanel workCase={c} />
          ) : (
            <DevReviewPanel workCase={c} />
          )}
        </div>
      ) : (
        <CustomerReviewWorkspace workCase={c} />
      )}
      <details
        className="document-workspace"
        key={view}
        open={handoff && view === "handoff"}
      >
        <summary>Đọc CRD / DRD · working v{c.version}</summary>
        <DocumentExperience
          workCase={c}
          defaultAudience={handoff ? "DRD" : "CRD"}
          scopeReqIds={scope}
        />
      </details>
    </div>
  );
}
