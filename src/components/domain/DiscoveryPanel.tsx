import { SectionSwitcher } from "../ui/SectionSwitcher";
import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import type { WorkCase, Module } from "../../types/case";
import { useApp } from "../../context/AppContext";
import { questions } from "../../data/questions";
import {
  discoveryChecks,
  discoveryProgress,
} from "../../services/discoveryService";
import { Card, Badge, Button, Textarea, Select } from "../ui/primitives";
import { useToast } from "../ui/Toast";
import { casePath } from "../../app/navigation";
import { GapPanel } from "./GapPanel";
export function DiscoveryPanel({ workCase: c }: { workCase: WorkCase }) {
  const [params, setParams] = useSearchParams();
  const view = ["questions", "gaps", "patterns", "checkpoint"].includes(
    params.get("view") ?? "",
  )
    ? params.get("view")!
    : "questions";
  const [module, setModule] = useState<Module>("Core");
  const { update } = useApp();
  const navigate = useNavigate();
  const toast = useToast();
  const [error, setError] = useState("");
  const progress = discoveryProgress(c);
  const run = (fn: () => void) => {
    try {
      fn();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="panel-stack">
      <SectionSwitcher
        label="Discovery views"
        value={view}
        onChange={(v) => setParams({ view: v }, { replace: true })}
        items={[
          { value: "questions", label: "Questions" },
          {
            value: "gaps",
            label: `Information Gaps · ${c.discovery.gaps.filter((g) => g.status !== "Resolved").length} còn mở`,
          },
          {
            value: "patterns",
            label: `Patterns · ${c.discovery.patterns.filter((p) => p.status !== "Validated").length} cần review`,
          },
          { value: "checkpoint", label: "Information Complete" },
        ]}
      />
      <div hidden={view !== "patterns"}>
        <Card>
          <div className="card-heading">
            <h3>Pattern & module selection</h3>
            <span>
              {progress.resolved}/{progress.total} thông tin được xác minh
            </span>
          </div>
          <div className="card-content">
            <div className="pattern-list">
              {c.discovery.patterns.map((p) => (
                <div key={p.module}>
                  <div>
                    <strong>
                      {p.module}
                      {p.module === "Process" ? " · Primary" : " · Supporting"}
                    </strong>
                    <p className="muted">
                      {p.module === "Process"
                        ? "Flow tiếp nhận và xử lý hoàn tiền."
                        : p.module === "Business Rule"
                          ? "Điều kiện đủ để hoàn tiền."
                          : p.module === "Integration"
                            ? "Dữ liệu và kết quả thanh toán."
                            : "Recovery khi kết quả chưa biết."}
                    </p>
                  </div>
                  <Badge>{p.status}</Badge>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() =>
                      run(() =>
                        update(c.id, {
                          type: "pattern",
                          module: p.module,
                          status: "Validated",
                        }),
                      )
                    }
                  >
                    Validate {p.module}
                  </Button>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() =>
                      run(() =>
                        update(c.id, {
                          type: "pattern",
                          module: p.module,
                          status: "Rejected",
                        }),
                      )
                    }
                  >
                    Reject
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
      <div hidden={view !== "questions"}>
        <Card>
          <div className="card-heading">
            <h3>Discovery questions</h3>
          </div>
          <div className="module-navigation" aria-label="Discovery modules">
            {(
              [
                "Core",
                "Process",
                "Business Rule",
                "Integration",
                "Exception",
              ] as Module[]
            ).map((m) => (
              <Button
                key={m}
                variant={m === module ? "primary" : "ghost"}
                aria-pressed={m === module}
                onClick={() => setModule(m)}
              >
                {m}
              </Button>
            ))}
          </div>
          <div className="card-content question-list">
            {questions
              .filter((q) => q.module === module)
              .map((q) => (
                <QuestionCard
                  key={`${c.id}-${q.id}-${c.version}`}
                  workCase={c}
                  questionId={q.id}
                />
              ))}
          </div>
        </Card>
      </div>
      <div hidden={view !== "gaps"}>
        <GapPanel workCase={c} />
      </div>
      <div hidden={view !== "checkpoint"}>
        <Card>
          <div className="card-heading">
            <h3>Information Complete</h3>
            <Button
              onClick={() => run(() => update(c.id, { type: "checkpoint" }))}
            >
              Chạy Discovery Checkpoint
            </Button>
          </div>
          <div className="card-content">
            <p className="muted">
              Phạm vi đối chiếu: các Required Information của Case đang được
              khai thác. Chưa chạy khác với Pass.
            </p>
            {c.discovery.checkpointRun ? (
              <div className="check-list">
                {discoveryChecks(c).map((check) => (
                  <div key={check.id}>
                    <Badge tone={check.status === "Pass" ? "sage" : "warning"}>
                      {check.status}
                    </Badge>
                    <div>
                      <strong>{check.id}</strong>
                      <p>{check.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3">Chưa chạy completeness checks.</p>
            )}
            <div className="action-row">
              <Button
                variant="secondary"
                onClick={() =>
                  run(() => {
                    update(c.id, { type: "advance", stage: "formation" });
                    navigate(casePath(c.id, "requirements"));
                    toast(
                      "Discovery đạt gate của phạm vi mẫu; bước Requirement vẫn là preview.",
                    );
                  })
                }
              >
                Tiếp tục Requirement Formation
              </Button>
            </div>
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
function QuestionCard({
  workCase: c,
  questionId,
}: {
  workCase: WorkCase;
  questionId: string;
}) {
  const q = questions.find((q) => q.id === questionId)!;
  const r = c.discovery.responses.find((r) => r.questionId === questionId)!;
  const [text, setText] = useState(r.text);
  const [source, setSource] = useState(r.source);
  const [error, setError] = useState("");
  const { update } = useApp();
  const toast = useToast();
  const gap = c.discovery.gaps.find((g) => g.questionId === q.id);
  const e = c.discovery.evidence.find((e) => e.id === r.evidenceId);
  return (
    <section className="question-card">
      <div className="flex items-center gap-3 flex-wrap">
        <strong>{q.id}</strong>
        <span className="provenance">
          {q.infoId} · {q.checkId}
        </span>
        {gap && (
          <Badge tone={gap.status === "Resolved" ? "sage" : "warning"}>
            {gap.status}
          </Badge>
        )}
      </div>
      <h3 className="mt-3">{q.question}</h3>
      <p className="muted mt-3">{q.why}</p>
      <div className="form-stack mt-4">
        <Textarea
          label={`Response ${q.id}`}
          value={text}
          rows={3}
          onChange={(e) => setText(e.target.value)}
        />
        <Select
          label={`Nguồn ${q.id}`}
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="">Chưa xác định nguồn</option>
          {c.discovery.stakeholders.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.role}
            </option>
          ))}
        </Select>
      </div>
      {e && (
        <p className="muted mt-3">
          {e.review} · {e.status} · {e.provenance} · v{e.version}
        </p>
      )}
      <div className="action-row">
        <Button
          variant="secondary"
          onClick={() => {
            try {
              update(c.id, {
                type: "response",
                questionId: q.id,
                text,
                sourceId: source,
              });
              toast("Đã lưu response; evidence chờ BA review.");
              setError("");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Lưu Response {q.id}
        </Button>
        {e && (
          <Link
            className="btn btn-ghost"
            to={`${casePath(c.id, "evidence")}?evidence=${encodeURIComponent(e.id)}`}
          >
            Review evidence
          </Link>
        )}
      </div>
      {error && <p className="field-error">{error}</p>}
    </section>
  );
}
