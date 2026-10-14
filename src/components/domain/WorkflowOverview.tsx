import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { WorkCase, Stage } from "../../types/case";
import { stageOrder, stageLabels } from "../../data/cases";
import { workflowDetails } from "../../services/previewService";
import { Card, Badge } from "../ui/primitives";
import { casePath } from "../../app/navigation";
export function WorkflowOverview({ workCase: c }: { workCase: WorkCase }) {
  const [selected, setSelected] = useState<Stage>(c.currentStage);
  useEffect(() => setSelected(c.currentStage), [c.currentStage, c.id]);
  const details = workflowDetails(c, selected);
  const destination =
    selected === "incoming" || selected === "context"
      ? "overview"
      : selected === "discovery"
        ? "discovery"
        : selected === "formation"
          ? "requirements"
          : "customer";
  return (
    <Card>
      <div className="card-heading">
        <div>
          <h3>End-to-End Workflow</h3>
          <p>Đang xử lý / replay: {stageLabels[c.currentStage]}</p>
        </div>
        <Badge>{c.status}</Badge>
      </div>
      <div className="workflow-grid">
        <nav className="workflow-nav" aria-label="Workflow steps">
          {stageOrder.map((stage, index) => (
            <button
              type="button"
              key={stage}
              aria-pressed={selected === stage}
              className={selected === stage ? "selected" : ""}
              onClick={() => setSelected(stage)}
            >
              <span>{index + 1}</span>
              <div>
                <strong>
                  {
                    {
                      incoming: "Incoming Request",
                      context: "Context Analysis",
                      discovery: "Discovery",
                      formation: "Requirement & Quality",
                      customer: "Customer Confirmation",
                      readiness: "Dev Readiness",
                      handoff: "Dev Handoff",
                    }[stage]
                  }
                </strong>
                <small>
                  {stage === c.currentStage
                    ? "Current Stage"
                    : stage === "context"
                      ? "Simulated suggestion"
                      : index < 3
                        ? ""
                        : "Preview Only"}
                </small>
              </div>
            </button>
          ))}
        </nav>
        <div className="workflow-detail">
          <div className="flex gap-3 items-center flex-wrap">
            <h3>{stageLabels[selected]}</h3>
            <span className="capability-label">
              {stageOrder.indexOf(selected) < 3
                ? "Implemented"
                : "Preview Only"}
            </span>
          </div>
          <p className="workflow-selection">
            Selected{" "}
            {stageOrder.indexOf(selected) >= 3 ? "Preview Stage" : "Stage"}:{" "}
            {stageLabels[selected]} · Current Stage:{" "}
            {stageLabels[c.currentStage]}
          </p>
          <div className="workflow-summary">
            {[
              ["Output", details.output],
              ["BA Action", details.action],
              ["Next Step / Conditions", details.next],
            ].map(([label, value]) => (
              <section className="detail-section" key={label}>
                <h3>{label}</h3>
                <p>{value}</p>
              </section>
            ))}
          </div>
          <details className="disclosure">
            <summary>Input & System Processing</summary>
            <section className="detail-section">
              <h3>Input</h3>
              <p>{details.input}</p>
            </section>
            <section className="detail-section">
              <h3>System Processing</h3>
              <p>{details.processing}</p>
            </section>
          </details>
          <Link
            className="btn btn-secondary"
            to={
              selected === "context"
                ? `${casePath(c.id, destination)}?view=context`
                : casePath(c.id, destination)
            }
          >
            Mở khu vực làm việc
          </Link>
        </div>
      </div>
    </Card>
  );
}
