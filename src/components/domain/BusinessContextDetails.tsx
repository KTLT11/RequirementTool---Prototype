import type { WorkCase } from "../../types/case";

// Design-document provenance stays in project documentation, not Case sources.
export function BusinessContextDetails({ workCase }: { workCase: WorkCase }) {
  return (
    <div className="business-context-details">
      <section className="detail-section">
        <h3>Incoming request</h3>
        <p>{workCase.incomingRequest}</p>
      </section>
      <section className="detail-section">
        <h3>Business context</h3>
        {workCase.context.items.slice(0, 4).map((i) => (
          <div key={i.id} className="linked-evidence">
            <strong>
              {i.label} · {i.certainty}
            </strong>
            <p>{i.text || "Chưa làm rõ."}</p>
            <span className="provenance">{i.provenance}</span>
          </div>
        ))}
      </section>
      <section className="detail-section">
        <h3>Thông tin nguồn</h3>
        <p>
          Incoming Request;{" "}
          {workCase.isDemo
            ? "Demo Scenario với stakeholder và phản hồi giả lập."
            : "thông tin do BA ghi nhận."}
        </p>
      </section>
      <section className="detail-section">
        <h3>Evidence</h3>
        <p>
          {workCase.discovery.evidence.length} evidence;{" "}
          {
            workCase.discovery.evidence.filter((e) => e.status === "Confirmed")
              .length
          }{" "}
          Confirmed{workCase.isDemo ? " trong kịch bản" : ""}. Customer
          Confirmation được ghi nhận riêng.
        </p>
      </section>
    </div>
  );
}
