import { useEffect, useState } from "react";
import {
  Link,
  useParams,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
  deriveTasks,
  selectTask,
  taskPath,
  safeReturn,
} from "../services/taskService";
import type { GuidedTask } from "../services/taskService";
import type { WorkCase } from "../types/case";
import type { CaseCommand } from "../services/caseTransitions";
import { casePath, workspaceSections } from "../app/navigation";
import { stageOrder, stageLabels } from "../data/cases";
import { layer2 } from "../services/requirementService";
import { ux } from "../services/uxService";
import { authorized } from "../services/discoveryService";
import { ContextDirectionAssist, DiscoveryQuestionAssist } from "../components/domain/DemoAssistance";
import { ReviewableTextarea } from "../components/ui/ContentAssist";
import { workflowDetails } from "../services/previewService";
import { TraceabilityPanel } from "../components/domain/TraceabilityPanel";
import { FormationDialog } from "../components/domain/RequirementWorkspace";
import {
  Button,
  Card,
  Badge,
  Textarea,
  Select,
  LoadingState,
  TextInput,
} from "../components/ui/primitives";
import { CaseForm, ResetDialog } from "../components/domain/CaseDialogs";
import { NotFoundPage } from "./WorkspacePage";
import { TaskNavigator } from "../components/domain/TaskNavigator";

const CONTEXT_ITEM_GROUPS: { title: string; ids: string[] }[] = [
  { title: "Vấn đề và mục tiêu", ids: ["need", "target"] },
  { title: "Hiện trạng và phạm vi", ids: ["current", "scope"] },
  { title: "Bên liên quan", ids: ["actors"] },
  { title: "Ràng buộc và phụ thuộc", ids: ["constraints", "dependencies", "assumption"] },
];
function contextItemNeedsWork(i: WorkCase["context"]["items"][number]) {
  return (
    !i.text.trim() ||
    (i.certainty !== "Known" && (!i.owner || !i.nextAction.trim()))
  );
}
function contextItemHasPendingSuggestion(i: WorkCase["context"]["items"][number]) {
  return i.provenance === "Simulated Suggestion";
}
const CERTAINTY_BADGE: Record<
  WorkCase["context"]["items"][number]["certainty"],
  { tone: "sage" | "warning" | "terracotta"; label: string }
> = {
  Known: { tone: "sage", label: "Đã rõ" },
  Unknown: { tone: "warning", label: "Chưa rõ" },
  Assumption: { tone: "terracotta", label: "Giả định — cần xác minh" },
};
function useWorkingCase() {
  const { caseId } = useParams();
  const api = useApp();
  return { ...api, c: api.cases.find((c) => c.id === caseId) };
}
function Header({ c }: { c: WorkCase }) {
  const [reset, setReset] = useState(false);
  return (
    <>
      <div className="v2-case-header">
        <div>
          <span className="small muted">
            {c.id} · Working v{c.version}
          </span>
          <h1>{c.name}</h1>
        </div>
        {c.isDemo && (
          <Button variant="ghost" onClick={() => setReset(true)}>
            Reset Demo
          </Button>
        )}
      </div>
      <Badge>Business stage: {stageLabels[c.currentStage]}</Badge>
      {reset && <ResetDialog workCase={c} onClose={() => setReset(false)} />}
    </>
  );
}
export function ContinuePage() {
  const { c, status, error, reload, lastChange } = useWorkingCase();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  useEffect(() => {
    if (c && !params.get("task")) {
      const next = deriveTasks(c).recommended;
      if (next) setParams({ task: next.id }, { replace: true });
    }
  }, [c, params, setParams]);
  if (status === "loading") return <LoadingState />;
  if (error)
    return (
      <div className="page-container">
        <p>{error}</p>
        <Button onClick={reload}>Thử lại</Button>
      </div>
    );
  if (!c) return <NotFoundPage caseMissing />;
  const state = selectTask(c, params.get("task")),
    task = state.selected,
    parent = state.tasks.find((t) => t.id === params.get("parent"));
  const receipt = lastChange?.after.id === c.id ? lastChange : null;
  const changed = receipt
    ? [
        [
          "Business stage",
          receipt.before.currentStage,
          receipt.after.currentStage,
        ],
        [
          "Incoming Request",
          receipt.before.incomingRequest,
          receipt.after.incomingRequest,
        ],
        [
          "Tài liệu nguồn",
          ux(receipt.before).documents,
          ux(receipt.after).documents,
        ],
        [
          "Review diễn giải từ nguồn",
          ux(receipt.before).extracted,
          ux(receipt.after).extracted,
        ],
        [
          "Discovery patterns",
          receipt.before.discovery.patterns,
          receipt.after.discovery.patterns,
        ],
        [
          "Discovery checkpoint",
          receipt.before.discovery.checkpointRun,
          receipt.after.discovery.checkpointRun,
        ],
        ["Context", receipt.before.context, receipt.after.context],
        [
          "Responses",
          receipt.before.discovery.responses,
          receipt.after.discovery.responses,
        ],
        [
          "Evidence",
          receipt.before.discovery.evidence,
          receipt.after.discovery.evidence,
        ],
        [
          "Gaps / decisions",
          receipt.before.discovery.gaps,
          receipt.after.discovery.gaps,
        ],
        [
          "Requirements / AC / validation",
          receipt.before.layer2,
          receipt.after.layer2,
        ],
        [
          "Customer record",
          receipt.before.confirmation,
          receipt.after.confirmation,
        ],
        ["Dev record", receipt.before.devReview, receipt.after.devReview],
        ["Documents", receipt.before.snapshots, receipt.after.snapshots],
      ]
        .filter(([, a, b]) => JSON.stringify(a) !== JSON.stringify(b))
        .map(([title]) => title)
    : [];
  return (
    <div className="page-container guided-page panel-stack">
      <Header c={c} />
      <h2>Continue Case — Tiếp tục Case</h2>
      {state.missing && (
        <p className="inline-feedback">
          Nhiệm vụ cũ không còn trong state sau reset/archive. Đề xuất hiện tại
          được hiển thị; dữ liệu cũ không bị thay bằng entity khác.
        </p>
      )}
      {task ? (
        <>
          <Card>
            <div className="card-content panel-stack">
              <div className="task-header-row">
                <div>
                  <span className="eyebrow">VIỆC HIỆN TẠI</span>
                  <h2>{task.goal}</h2>
                  <p>{task.purpose}</p>
                  {parent && (
                    <p>
                      Đang làm rõ điều kiện để tiếp tục:{" "}
                      <Link to={taskPath(c.id, parent.id)}>{parent.goal}</Link>
                    </p>
                  )}
                </div>
                <Badge>
                  {task.complete
                    ? "Điều kiện task đã đáp ứng"
                    : task.available
                      ? "Có thể thực hiện"
                      : "Đang chờ điều kiện"}
                </Badge>
              </div>
              {task.type !== "context" && (
                <section>
                  <h3>Thông tin liên quan</h3>
                  <div className="guided-inputs">
                    {task.inputs.map((i, n) => (
                      <section key={n}>
                        <strong>{i.title}</strong>
                        <p>{i.value}</p>
                      </section>
                    ))}
                  </div>
                  {task.preconditions.length > 0 && (
                    <>
                      <h3>Điều kiện cần đáp ứng</h3>
                      {task.preconditions.map((x) => (
                        <p className="field-error" key={x}>
                          {x}
                        </p>
                      ))}
                    </>
                  )}
                  {task.blockers.length > 0 && (
                    <>
                      <h3>Thông tin còn thiếu / cần xử lý</h3>
                      {task.blockers.map((x) => (
                        <p key={x}>{x}</p>
                      ))}
                    </>
                  )}
                </section>
              )}
              <section>
                <h3
                  id="guided-task-action"
                  tabIndex={-1}
                  className={task.type === "context" ? "sr-only" : undefined}
                >
                  Thao tác BA
                </h3>
                <TaskAction
                  key={`${task.id}:${c.history.filter((a) => a.action.startsWith("Reset Demo")).at(-1)?.id || "initial"}`}
                  c={c}
                  task={task}
                  parent={parent?.id}
                />
              </section>
              <details className="disclosure task-disclosure">
                <summary>Điều kiện hoàn tất và truy vết</summary>
                <p>{task.completion}</p>
                {task.related.map((e) => (
                  <TraceabilityPanel
                    key={e.id}
                    workCase={c}
                    kind={e.kind}
                    id={e.id}
                  />
                ))}
              </details>
            </div>
          </Card>
          {receipt && (
            <Card>
              <div className="card-content">
                <h3>Result — thao tác gần nhất của Case</h3>
                <p>
                  {receipt.after.history.at(-1)?.action || "Draft đã được giữ."}
                </p>
                <p>
                  Version {receipt.before.version} → {receipt.after.version}.
                  Phần thay đổi:{" "}
                  {changed.join(", ") ||
                    "Draft/UI state; không đổi quyết định nghiệp vụ."}
                </p>
                <p>
                  {task.complete
                    ? "Task đã đạt completion predicate."
                    : "Nhiệm vụ vẫn còn điều kiện cần xử lý; lưu dữ liệu không tự vượt checkpoint."}
                </p>
              </div>
            </Card>
          )}
          <Card>
            <div className="card-content">
              <TaskNavigator
                c={c}
                current={task}
                tasks={state.tasks}
                recommended={state.recommended}
                frontier={state.frontier}
                returnTo={
                  parent
                    ? {
                        title: parent.goal,
                        path:
                          safeReturn(c.id, params.get("origin")) ||
                          taskPath(c.id, parent.id),
                      }
                    : undefined
                }
              />
            </div>
          </Card>
        </>
      ) : (
        <p>
          Chưa có nhiệm vụ tự động có đủ capability. Không suy rằng Case đã hoàn
          tất; xem scope và baseline để review.
        </p>
      )}
      <Link className="text-link" to={casePath(c.id, "explore")}>
        Xem toàn bộ quy trình và hướng dẫn
      </Link>
    </div>
  );
}
function TaskAction({
  c,
  task: t,
  parent,
}: {
  c: WorkCase;
  task: GuidedTask;
  parent?: string;
}) {
  const { update } = useApp(),
    nav = useNavigate();
  const [error, setError] = useState(""),
    [form, setForm] = useState(false),
    [editing, setEditing] = useState(false),
    [editingItemId, setEditingItemId] = useState<string | null>(null),
    [basis, setBasis] = useState(""),
    [authority, setAuthority] = useState(""),
    [mode, setMode] = useState("clarify"),
    [source, setSource] = useState("");
  const storage = `guided-ui-draft:${c.id}:${t.id}:${c.history.filter((a) => a.action.startsWith("Reset Demo")).at(-1)?.id || "initial"}`;
  const [context, setContext] = useState(() => {
    try {
      return (
        JSON.parse(sessionStorage.getItem(storage) || "null") ||
        structuredClone(c.context)
      );
    } catch {
      return structuredClone(c.context);
    }
  });
  const groupsStorage = `guided-context-groups:${c.id}`;
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(groupsStorage) || "null");
      if (saved) return saved;
    } catch {
      /* fall through to default below */
    }
    const defaultOpen = CONTEXT_ITEM_GROUPS.find((group) =>
      group.ids.some((id) => {
        const item = c.context.items.find((i) => i.id === id);
        return item && contextItemNeedsWork(item);
      }),
    );
    return Object.fromEntries(
      CONTEXT_ITEM_GROUPS.map((group) => [
        group.title,
        group.title === (defaultOpen ?? CONTEXT_ITEM_GROUPS[0]).title,
      ]),
    );
  });
  const toggleGroup = (title: string, open: boolean) => {
    const next = { ...openGroups, [title]: open };
    setOpenGroups(next);
    sessionStorage.setItem(groupsStorage, JSON.stringify(next));
  };
  const setAllGroups = (open: boolean) => {
    const next = Object.fromEntries(
      CONTEXT_ITEM_GROUPS.map((group) => [group.title, open]),
    );
    setOpenGroups(next);
    sessionStorage.setItem(groupsStorage, JSON.stringify(next));
  };
  useEffect(() => {
    if (t.type === "context" && editing)
      sessionStorage.setItem(storage, JSON.stringify(context));
  }, [context, editing, storage, t.type]);
  const run = (command: CaseCommand) => {
    try {
      update(c.id, command);
      setError("");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  };
  const [actionParams] = useSearchParams();
  const origin = `${casePath(c.id, "continue")}?${actionParams.toString()}`,
    toData = (url: string) =>
      nav(
        url +
          (url.includes("?") ? "&" : "?") +
          `returnTo=${encodeURIComponent(origin)}`,
      );
  const q = c.discovery.responses.find((q) => q.questionId === t.target),
    draft = ux(c).drafts[t.target] ?? {
      text: q?.text || "",
      source: q?.source || "",
    };
  const evidence = c.discovery.evidence.find((e) => e.id === t.target),
    gap = c.discovery.gaps.find((g) => g.id === t.target),
    selected = c.discovery.evidence.find((e) => e.id === source);
  const peers = deriveTasks(c).tasks;
  const relatedTasks = gap
    ? peers.filter(
        (x) => x.type === "evidence" && gap.evidenceIds.includes(x.target),
      )
    : [];
  const genericLink = t.route ? (
    <Button variant="secondary" onClick={() => toData(t.route!)}>
      {t.available ? t.action : "Xem dữ liệu / điều kiện của scope"}
    </Button>
  ) : null;
  let action;
  if (t.type === "context") {
    const missing = c.context.items.some(contextItemNeedsWork);
    const needsWorkItems = c.context.items.filter(contextItemNeedsWork);
    const groupOf = (itemId: string) =>
      CONTEXT_ITEM_GROUPS.find((group) => group.ids.includes(itemId));
    const openToItem = (itemId: string) => {
      const group = groupOf(itemId);
      if (group) toggleGroup(group.title, true);
      requestAnimationFrame(() => {
        document
          .getElementById(`context-item-${itemId}`)
          ?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    };
    const startEdit = (itemId: string | null) => {
      setEditing(true);
      setEditingItemId(itemId);
    };
    const updateItem = (
      itemId: string,
      patch: Partial<WorkCase["context"]["items"][number]>,
    ) =>
      setContext({
        ...context,
        items: context.items.map(
          (x: WorkCase["context"]["items"][number]) =>
            x.id === itemId
              ? { ...x, ...patch, provenance: "BA-entered Information" }
              : x,
        ),
      });
    action = (
      <div className="panel-stack">
        <section className="context-needs-attention">
          <h3>Các điểm cần làm rõ</h3>
          {needsWorkItems.length ? (
            <ul className="context-attention-list">
              {needsWorkItems.map((i) => {
                const badge = CERTAINTY_BADGE[i.certainty];
                const isLong = i.text.length > 110;
                return (
                  <li key={i.id}>
                    <div className="context-attention-head">
                      <strong>{i.label}</strong>
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                    </div>
                    {isLong ? (
                      <details className="context-attention-expand">
                        <summary>
                          {i.text.trim() ? i.text.slice(0, 110) + "…" : "Chưa cung cấp."}
                        </summary>
                        <p>{i.text}</p>
                      </details>
                    ) : (
                      <p>{i.text.trim() || "Chưa cung cấp."}</p>
                    )}
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => openToItem(i.id)}
                    >
                      Mở
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="small muted">Không còn điểm nào cần làm rõ.</p>
          )}
        </section>
        <details className="disclosure task-disclosure">
          <summary>Bối cảnh hiện có</summary>
          <dl className="context-reference-list">
            {c.context.items.map((i) => {
              const badge = CERTAINTY_BADGE[i.certainty];
              return (
                <div key={i.id}>
                  <dt>
                    {i.label}
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </dt>
                  <dd>{i.text.trim() || "Chưa cung cấp."}</dd>
                </div>
              );
            })}
          </dl>
        </details>
        <details className="disclosure task-disclosure">
          <summary>Xem yêu cầu ban đầu</summary>
          <p>{c.incomingRequest}</p>
        </details>
        <section className="context-direction-section">
          <h3>Hướng Discovery đã chọn</h3>
          <ContextDirectionAssist workCase={c} />
          {c.context.suggestionStatus === "Accepted" &&
            c.discovery.patterns.length > 0 && (
              <div className="context-related-modules">
                <span className="context-section-label">Module liên quan</span>
                <ul>
                  {c.discovery.patterns.map((p) => (
                    <li key={p.module}>
                      <span>{p.module}</span>
                      <Badge
                        tone={
                          p.status === "Validated"
                            ? "sage"
                            : p.status === "Rejected"
                              ? "terracotta"
                              : "neutral"
                        }
                      >
                        {p.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </section>
        {editing ? (
          <Button
            onClick={() => {
              if (run({ type: "context", context })) {
                setEditing(false);
                setEditingItemId(null);
                sessionStorage.removeItem(storage);
              }
            }}
          >
            Lưu context
          </Button>
        ) : missing || c.context.reassessmentRequired ? (
          <Button onClick={() => startEdit(null)}>
            Làm rõ / điều chỉnh bối cảnh
          </Button>
        ) : c.context.suggestionStatus !== "Accepted" ? (
          <p className="small muted">Chọn hoặc chỉnh sửa hướng gợi ý ở trên trước khi review bối cảnh.</p>
        ) : !c.context.reviewed ? (
          <Button onClick={() => run({ type: "contextReview" })}>
            Ghi nhận BA review bối cảnh
          </Button>
        ) : (
          <p className="assist-review review-pass" role="status">✓ Bối cảnh đã đạt điều kiện demo. BA chọn công việc tiếp theo khi sẵn sàng.</p>
        )}
        <div className="action-row context-groups-toolbar">
          <Button variant="ghost" size="small" onClick={() => setAllGroups(true)}>
            Mở tất cả
          </Button>
          <Button variant="ghost" size="small" onClick={() => setAllGroups(false)}>
            Thu gọn tất cả
          </Button>
        </div>
        <div className="context-item-groups">
          {CONTEXT_ITEM_GROUPS.map((group) => {
            const groupItems: WorkCase["context"]["items"][number][] = group.ids
              .map((id) => context.items.find((i: WorkCase["context"]["items"][number]) => i.id === id))
              .filter((i: WorkCase["context"]["items"][number] | undefined): i is WorkCase["context"]["items"][number] => !!i);
            if (!groupItems.length) return null;
            const needsWorkCount = groupItems.filter(contextItemNeedsWork).length;
            const pendingSuggestionCount = groupItems.filter(
              contextItemHasPendingSuggestion,
            ).length;
            const summaryText =
              groupItems
                .map((i) => i.text.trim())
                .filter(Boolean)
                .join(" · ") || "Chưa có nội dung";
            const isOpen = !!openGroups[group.title];
            return (
              <details
                className="disclosure task-disclosure context-group-accordion"
                key={group.title}
                open={isOpen}
                onToggle={(e) =>
                  toggleGroup(group.title, (e.target as HTMLDetailsElement).open)
                }
              >
                <summary aria-controls={`context-group-content-${group.title}`}>
                  <span className="context-group-summary-head">
                    <strong>{group.title}</strong>
                    {needsWorkCount > 0 && (
                      <Badge tone="warning">Cần làm rõ: {needsWorkCount}</Badge>
                    )}
                    {pendingSuggestionCount > 0 && (
                      <Badge tone="terracotta">
                        Gợi ý chờ duyệt: {pendingSuggestionCount}
                      </Badge>
                    )}
                  </span>
                  {!isOpen && (
                    <span className="context-group-summary-text">
                      {summaryText}
                    </span>
                  )}
                </summary>
                <div
                  className="context-item-group-content"
                  id={`context-group-content-${group.title}`}
                >
                  {groupItems.map((i: WorkCase["context"]["items"][number]) => {
                    const isEditing = editing && (editingItemId === null || editingItemId === i.id);
                    const badge = CERTAINTY_BADGE[i.certainty];
                    return (
                      <div
                        className="context-item-row"
                        id={`context-item-${i.id}`}
                        key={i.id}
                      >
                        <div className="context-item-row-head">
                          <strong>{i.label}</strong>
                          <Badge tone={badge.tone}>{badge.label}</Badge>
                          {!isEditing && (
                            <Button
                              variant="ghost"
                              size="small"
                              onClick={() => startEdit(i.id)}
                            >
                              Chỉnh sửa
                            </Button>
                          )}
                        </div>
                        {isEditing ? (
                          <div className="two-column context-item-edit-grid">
                            <Textarea
                              label="Nội dung"
                              value={i.text}
                              onChange={(e) =>
                                updateItem(i.id, { text: e.target.value })
                              }
                            />
                            <Select
                              label="Trạng thái"
                              value={i.certainty}
                              onChange={(e) =>
                                updateItem(i.id, {
                                  certainty: e.target
                                    .value as typeof i.certainty,
                                })
                              }
                            >
                              <option>Known</option>
                              <option>Unknown</option>
                              <option>Assumption</option>
                            </Select>
                            {i.certainty !== "Known" && (
                              <>
                                <Select
                                  label="Người phụ trách"
                                  value={i.owner}
                                  onChange={(e) =>
                                    updateItem(i.id, { owner: e.target.value })
                                  }
                                >
                                  <option value="">Chọn người làm rõ</option>
                                  {c.discovery.stakeholders.map((s) => (
                                    <option value={s.id} key={s.id}>
                                      {s.name}
                                    </option>
                                  ))}
                                </Select>
                                <Textarea
                                  label="Việc cần làm rõ"
                                  value={i.nextAction}
                                  onChange={(e) =>
                                    updateItem(i.id, {
                                      nextAction: e.target.value,
                                    })
                                  }
                                />
                              </>
                            )}
                          </div>
                        ) : (
                          <>
                            <p>{i.text || "Chưa cung cấp."}</p>
                            {i.certainty !== "Known" && (
                              <p className="small muted">
                                {c.discovery.stakeholders.find(
                                  (s) => s.id === i.owner,
                                )?.name ??
                                  i.owner ??
                                  "Chưa có owner"}{" "}
                                · {i.nextAction || "Cần follow-up"}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
        {editing ? (
          <Button
            onClick={() => {
              if (run({ type: "context", context })) {
                setEditing(false);
                setEditingItemId(null);
                sessionStorage.removeItem(storage);
              }
            }}
          >
            Lưu context
          </Button>
        ) : missing || c.context.reassessmentRequired ? (
          <Button onClick={() => startEdit(null)}>
            Làm rõ / điều chỉnh bối cảnh
          </Button>
        ) : c.context.suggestionStatus !== "Accepted" ? (
          <p className="small muted">Chọn hoặc chỉnh sửa hướng gợi ý ở trên trước khi review bối cảnh.</p>
        ) : !c.context.reviewed ? (
          <Button onClick={() => run({ type: "contextReview" })}>
            Ghi nhận BA review bối cảnh
          </Button>
        ) : (
          <p className="assist-review review-pass" role="status">✓ Bối cảnh đã đạt điều kiện demo. BA chọn công việc tiếp theo khi sẵn sàng.</p>
        )}
        <details className="disclosure task-disclosure">
          <summary>Điều chỉnh context hoặc không dùng đề xuất</summary>
          <Button variant="secondary" onClick={() => startEdit(null)}>
            Chỉnh sửa tất cả
          </Button>
          <Button
            variant="ghost"
            onClick={() => run({ type: "suggestion", outcome: "Rejected" })}
          >
            Không dùng đề xuất
          </Button>
          <Link
            to={`${casePath(c.id, "context")}?returnTo=${encodeURIComponent(origin)}`}
          >
            Review context sâu
          </Link>
        </details>
      </div>
    );
  } else if (t.type === "question")
    action = (
      <div className="panel-stack">
        <DiscoveryQuestionAssist key={t.target} workCase={c} questionId={t.target} />
        <ReviewableTextarea
          label="Response của câu hỏi này"
          value={draft.text}
          onChange={(value) =>
            run({
              type: "ux",
              command: {
                op: "draft",
                questionId: t.target,
                text: value,
                source: draft.source,
              },
            })
          }
        />
        <Select
          label="Nguồn cung cấp thông tin"
          value={draft.source}
          onChange={(e) =>
            run({
              type: "ux",
              command: {
                op: "draft",
                questionId: t.target,
                text: draft.text,
                source: e.target.value,
              },
            })
          }
        >
          <option value="">Chọn nguồn</option>
          {c.discovery.stakeholders.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Button
          disabled={!ux(c).drafts[t.target]}
          onClick={() =>
            run({ type: "ux", command: { op: "save", questionId: t.target } })
          }
        >
          Lưu response
        </Button>
        {!ux(c).drafts[t.target] && (
          <p className="small muted">
            Chỉnh response/nguồn để có draft mới. Response đã lưu không tự
            Confirmed Evidence.
          </p>
        )}
      </div>
    );
  else if (t.type === "advance")
    action = (
      <>
        <Button
          disabled={!t.available || t.complete}
          onClick={() =>
            run({
              type: "advance",
              stage: t.target as "discovery" | "formation",
            })
          }
        >
          {t.action}
        </Button>
        <p>
          {t.complete
            ? "Stage transition đã ghi nhận."
            : t.preconditions.join("; ")}
        </p>
      </>
    );
  else if (t.type === "checkpoint")
    action = (
      <>
        <Button
          disabled={!t.available}
          onClick={() => run({ type: "checkpoint" })}
        >
          Chạy Information Complete checkpoint
        </Button>
        {genericLink}
      </>
    );
  else if (t.type === "pattern")
    action = (
      <>
        <Button
          disabled={!t.available}
          onClick={() =>
            run({ type: "pattern", module: t.target, status: "Validated" })
          }
        >
          Ghi nhận BA đã xác định module áp dụng
        </Button>
        <details>
          <summary>Module không áp dụng / cần review lại</summary>
          <Button
            variant="secondary"
            onClick={() =>
              run({ type: "pattern", module: t.target, status: "Rejected" })
            }
          >
            Ghi nhận không sử dụng module
          </Button>
          {genericLink}
        </details>
        <p>
          BA cần đối chiếu evidence trước khi quyết định; hệ thống không tự xác
          nhận applicability.
        </p>
      </>
    );
  else if (t.type === "evidence" && evidence)
    action = (
      <div className="panel-stack">
        {evidence.review !== "Reviewed" ? (
          <Button
            onClick={() =>
              run({
                type: "review",
                evidenceId: evidence.id,
                review: "Reviewed",
              })
            }
          >
            Ghi nhận đã review nguồn
          </Button>
        ) : evidence.status !== "Confirmed" ? (
          <>
            <Select
              label="Authority xác nhận nguồn"
              value={authority}
              onChange={(e) => setAuthority(e.target.value)}
            >
              <option value="">Chọn đúng authority của nguồn</option>
              {c.discovery.stakeholders
                .filter((s) => authorized(c, evidence, s.id))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.role}
                  </option>
                ))}
            </Select>
            <Textarea
              label="Căn cứ xác minh và phạm vi"
              value={basis}
              onChange={(e) => setBasis(e.target.value)}
            />
            <Button
              disabled={!authority || !basis.trim()}
              onClick={() =>
                run({
                  type: "confirm",
                  evidenceId: evidence.id,
                  authorityId: authority,
                  basis,
                })
              }
            >
              Ghi Evidence Confirmed có căn cứ
            </Button>
            {(!authority || !basis.trim()) && (
              <p>Chọn authority hợp lệ và nhập căn cứ trước khi xác nhận.</p>
            )}
          </>
        ) : (
          <p>
            Nguồn đã Reviewed + Confirmed; các Gap/conflict liên quan vẫn cần
            điều kiện riêng.
          </p>
        )}
        {genericLink}
      </div>
    );
  else if (t.type === "gap" && gap)
    action = (
      <div className="panel-stack">
        <h3>Review các nguồn trước khi quyết định</h3>
        {relatedTasks.map((x) => (
          <Link
            className="text-link"
            key={x.id}
            to={`${taskPath(c.id, x.id, t.id)}&origin=${encodeURIComponent(origin)}`}
          >
            {x.goal}:{" "}
            {c.discovery.evidence.find((e) => e.id === x.target)?.statement}
          </Link>
        ))}
        <Select
          label="Thao tác với Gap"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="clarify">Ghi việc cần làm rõ</option>
          <option value="resolve">Ghi resolution có căn cứ</option>
        </Select>
        {mode === "resolve" && (
          <Select
            label="Evidence làm căn cứ"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="">Chọn nguồn đã xác minh</option>
            {c.discovery.evidence
              .filter((e) => gap.evidenceIds.includes(e.id))
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.statement} · {e.review}/{e.status}
                </option>
              ))}
          </Select>
        )}
        <Select
          label={
            mode === "clarify" ? "Người cần làm rõ" : "Authority cho resolution"
          }
          value={authority}
          onChange={(e) => setAuthority(e.target.value)}
        >
          <option value="">Chọn stakeholder</option>
          {c.discovery.stakeholders.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.role}
            </option>
          ))}
        </Select>
        <Textarea
          label={
            mode === "clarify"
              ? "Nội dung clarification"
              : "Căn cứ resolution và phạm vi"
          }
          value={basis}
          onChange={(e) => setBasis(e.target.value)}
        />
        <Button
          disabled={
            !basis.trim() ||
            !authority ||
            (mode === "resolve" &&
              (!selected ||
                selected.status !== "Confirmed" ||
                selected.review !== "Reviewed" ||
                !authorized(c, selected, authority)))
          }
          onClick={() =>
            run(
              mode === "clarify"
                ? {
                    type: "clarify",
                    gapId: gap.id,
                    text: basis,
                    owner: authority,
                  }
                : {
                    type: "resolve",
                    gapId: gap.id,
                    evidenceId: source,
                    authorityId: authority,
                    basis,
                  },
            )
          }
        >
          {mode === "clarify"
            ? "Ghi clarification — chưa đóng Gap"
            : "Ghi resolution"}
        </Button>
        <p>
          {mode === "resolve"
            ? "Cần nguồn Reviewed + Confirmed, đúng authority và căn cứ."
            : "Clarification cần nội dung và người có thể trả lời; không tự resolve."}
        </p>
        {gap.clarifications.map((n) => (
          <p key={n.id}>Đã ghi: {n.text}</p>
        ))}
      </div>
    );
  else if (t.type === "validate")
    action = (
      <>
        <Button
          disabled={!t.available}
          onClick={() =>
            run({ type: "layer2", command: { op: "validate", ids: t.scope } })
          }
        >
          Chạy validation scope này
        </Button>
        {!t.available && <p>{t.preconditions.join("; ")}</p>}
        {genericLink}
      </>
    );
  else if (t.type === "formation")
    action = (
      <>
        <Button onClick={() => setForm(true)}>
          Tạo Requirement từ nguồn đã chọn
        </Button>
        {form && (
          <FormationDialog
            workCase={c}
            returnTo={origin}
            onClose={() => setForm(false)}
          />
        )}
        <p>Draft giữ source links; completion của scope cần BA judgment.</p>
      </>
    );
  else if (t.type === "finding") {
    const result = layer2(c).results.find((x) => x.id === t.target);
    const linkedReq = layer2(c).requirements.find(
      (r) => r.id === result?.requirementId,
    );
    const upstream = peers.filter(
      (x) =>
        ["gap", "evidence"].includes(x.type) &&
        !x.complete &&
        (x.type === "gap"
          ? c.discovery.gaps.some(
              (g) =>
                g.id === x.target &&
                linkedReq?.questionIds.includes(g.questionId),
            )
          : linkedReq?.evidenceIds.includes(x.target)),
    );
    action = (
      <div className="panel-stack">
        {result?.freshness === "Stale" ? (
          <Button
            disabled={!!layer2(c).drafts[result.requirementId]}
            onClick={() =>
              run({
                type: "layer2",
                command: { op: "validate", ids: [result.requirementId] },
              })
            }
          >
            Re-validate sau review impact
          </Button>
        ) : (
          genericLink
        )}
        {result && layer2(c).drafts[result.requirementId] && (
          <p>Lưu draft trước khi re-validation.</p>
        )}
        {upstream.length > 0 && (
          <details>
            <summary>Làm rõ business information đang chặn scope</summary>
            {upstream.map((x) => (
              <Link
                className="trace-item"
                key={x.id}
                to={`${taskPath(c.id, x.id, t.id)}&origin=${encodeURIComponent(origin)}`}
              >
                {x.goal}
              </Link>
            ))}
          </details>
        )}
        <p>
          Fail cần sửa đúng entity; Unknown cần review hoặc nguồn xác minh.
          Result chỉ đổi sau validation theo rule.
        </p>
      </div>
    );
  } else if (t.type === "incoming")
    action = (
      <>
        <Button onClick={() => setForm(true)}>Chỉnh yêu cầu gốc</Button>
        {form && <CaseForm workCase={c} onClose={() => setForm(false)} />}
      </>
    );
  else
    action = (
      <div className="panel-stack">
        {genericLink}
        <p>
          {t.preconditions.join("; ") ||
            "Thao tác review/snapshot dùng services hiện có. Không suy validity hoặc external blockers từ narrative."}
        </p>
        {t.type === "readiness" && (
          <details>
            <summary>Làm rõ điều kiện đang chặn readiness</summary>
            {peers
              .filter(
                (x) =>
                  !x.complete &&
                  (x.scope.some((id) => t.scope.includes(id)) ||
                    (x.type === "gap" &&
                      c.discovery.gaps.some(
                        (g) =>
                          g.id === x.target &&
                          layer2(c).requirements.some(
                            (r) =>
                              t.scope.includes(r.id) &&
                              r.questionIds.includes(g.questionId),
                          ),
                      ))) &&
                  x.id !== t.id,
              )
              .map((x) => (
                <Link
                  className="trace-item"
                  key={x.id}
                  to={`${taskPath(c.id, x.id, t.id)}&origin=${encodeURIComponent(origin)}`}
                >
                  {x.goal}
                </Link>
              ))}
          </details>
        )}
      </div>
    );
  return (
    <>
      {action}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
export function ExplorePage() {
  const { c, status } = useWorkingCase();
  const [params, setParams] = useSearchParams();
  if (status === "loading") return <LoadingState />;
  if (!c) return <NotFoundPage caseMissing />;
  const s = stageOrder.find((s) => s === params.get("stage")) || "incoming",
    d = workflowDetails(c, s),
    state = deriveTasks(c);
  const index = stageOrder.indexOf(state.recommended?.stage || "handoff");
  return (
    <div className="page-container guided-page panel-stack">
      <Header c={c} />
      <h2>Explore Workflow — Xem quy trình</h2>
      <p>
        Xem purpose, input và điều kiện. Việc xem không chạy command, tạo
        confirmation hoặc thay business stage.
      </p>
      <nav className="progress-rail" aria-label="Workflow preview">
        {stageOrder.map((x, i) => {
          const relevant = state.tasks.filter(
              (t) =>
                t.stage === x && t.type !== "documents" && t.type !== "source",
            ),
            done = relevant.length > 0 && relevant.every((t) => t.complete);
          return (
            <button
              key={x}
              className={s === x ? "selected" : undefined}
              onClick={() => setParams({ stage: x })}
              aria-pressed={s === x}
            >
              <strong>{stageLabels[x]}</strong>
              <small>
                {done
                  ? "Completed"
                  : i === index
                    ? "Current"
                    : "Future / cần xem điều kiện"}
              </small>
            </button>
          );
        })}
      </nav>
      <Card>
        <div className="card-content panel-stack">
          <h3>{stageLabels[s]}</h3>
          <Badge>Xem trước · read-only</Badge>
          <h3>Purpose</h3>
          <p>
            {s === "formation"
              ? "Hình thành và kiểm tra Requirement dựa trên nguồn."
              : d.action}
          </p>
          <h3>Input</h3>
          <p>{d.input}</p>
          <h3>Thao tác BA</h3>
          <p>{d.action}</p>
          <h3>Output</h3>
          <p>
            {s === "customer"
              ? `${c.confirmation.outcome} · scope ${c.confirmation.scopeReqIds.length} Requirements`
              : s === "handoff"
                ? `${c.snapshots.length} snapshots · Dev ${c.devReview.outcome}`
                : d.output}
          </p>
          <h3>Checkpoint</h3>
          <p>{d.next}</p>
          <h3>Làm việc trong state hiện tại</h3>
          {state.tasks
            .filter((t) => t.stage === s && !t.complete)
            .map((t) => (
              <Link className="trace-item" key={t.id} to={taskPath(c.id, t.id)}>
                <strong>{t.goal}</strong>
                <span>
                  {t.available
                    ? "Mở nhiệm vụ để thao tác"
                    : "Xem điều kiện chưa đủ"}
                </span>
              </Link>
            ))}
          <details className="disclosure">
            <summary>Hướng dẫn demo — minh họa cách dùng</summary>
            <p>
              Request → Context → Discovery → review/clarify evidence →
              Formation → Quality correction/re-validation → Customer scope →
              Readiness → Documents & Dev review.
            </p>
            <p>
              Chọn task để làm thật. Sources/extraction suggestions có nhãn mô
              phỏng; xem hướng dẫn không tự tạo business decisions.
            </p>
            <Link to={casePath(c.id, "continue")}>
              Tiếp tục Case theo actual state
            </Link>
          </details>
        </div>
      </Card>
    </div>
  );
}
export function DataPage() {
  const { c, status } = useWorkingCase();
  if (status === "loading") return <LoadingState />;
  if (!c) return <NotFoundPage caseMissing />;
  return (
    <div className="page-container panel-stack">
      <Header c={c} />
      <h2>Dữ liệu Case</h2>
      <p>
        Tra cứu hoặc chỉnh sửa chuyên sâu. Tiếp tục Case để được dẫn đến công
        việc cần làm.
      </p>
      <div className="quick-access">
        {workspaceSections
          .filter((s) => s.slug !== "overview")
          .map((s) => (
            <Link key={s.slug} to={casePath(c.id, s.slug)}>
              <strong>{s.label}</strong>
              <span>{s.title}</span>
            </Link>
          ))}
      </div>
    </div>
  );
}
