import { useState } from "react";
import { Link } from "react-router-dom";
import type { WorkCase } from "../../types/case";
import { useApp } from "../../context/AppContext";
import { Button, Card, Badge, Select, Textarea } from "../ui/primitives";
import { Drawer } from "../ui/Overlay";
import { useToast } from "../ui/Toast";
import { casePath } from "../../app/navigation";
export function GapPanel({ workCase: c }: { workCase: WorkCase }) {
  const [filter, setFilter] = useState("active");
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [owner, setOwner] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  const [basis, setBasis] = useState("");
  const [error, setError] = useState("");
  const { update } = useApp();
  const toast = useToast();
  const gap = c.discovery.gaps.find((g) => g.id === selected);
  const run = (fn: () => void) => {
    try {
      fn();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const visible = c.discovery.gaps.filter(
    (g) =>
      filter === "all" ||
      (filter === "active" && g.status !== "Resolved") ||
      g.status === filter,
  );
  return (
    <Card>
      <div className="card-heading">
        <h3>Information gaps</h3>
        <Select
          label="Lọc Gap"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="active">Còn mở</option>
          <option value="all">Tất cả</option>
          <option>Open</option>
          <option>In Clarification</option>
          <option>Resolved</option>
        </Select>
      </div>
      <div className="card-content gap-list">
        {visible.map((g) => (
          <button
            type="button"
            className="gap-row"
            key={g.id}
            onClick={() => {
              setSelected(g.id);
              setNote("");
              setBasis("");
              setEvidenceId("");
              setOwner("");
              setError("");
            }}
          >
            <div>
              <strong>{g.id}</strong>
              <p>{g.description}</p>
              <span className="provenance">
                {g.module} · {g.infoId} · {g.checkId}
              </span>
            </div>
            <Badge tone={g.status === "Resolved" ? "sage" : "warning"}>
              {g.type} · {g.status}
            </Badge>
          </button>
        ))}
        {!visible.length && (
          <p className="muted">Không có Gap phù hợp bộ lọc.</p>
        )}
      </div>
      <Drawer
        open={!!gap}
        title="Information Gap"
        description={gap?.id}
        onClose={() => setSelected(null)}
        footer={
          <Button variant="secondary" onClick={() => setSelected(null)}>
            Đóng
          </Button>
        }
      >
        {gap && (
          <>
            <p>{gap.description}</p>
            <p className="provenance mt-3">
              {gap.questionId} → {gap.infoId} → {gap.checkId}
            </p>
            <Badge tone="warning">
              {gap.type} · {gap.status}
            </Badge>
            <section className="detail-section mt-4">
              <h3>Evidence liên quan</h3>
              {gap.evidenceIds.map((id) => {
                const e = c.discovery.evidence.find((e) => e.id === id)!;
                return (
                  <div className="linked-evidence" key={id}>
                    <p>{e.statement}</p>
                    <p className="muted">
                      {e.sourceId} · {e.review} · {e.status} · v{e.version}
                    </p>
                    <Link
                      onClick={() => setSelected(null)}
                      className="text-link"
                      to={`${casePath(c.id, "evidence")}?evidence=${encodeURIComponent(id)}`}
                    >
                      Mở evidence
                    </Link>
                  </div>
                );
              })}
            </section>
            <section className="detail-section">
              <h3>Clarification tracking</h3>
              {gap.clarifications.map((item) => (
                <p key={item.id}>
                  {item.text} —{" "}
                  {c.discovery.stakeholders.find((s) => s.id === item.owner)
                    ?.name ?? item.owner}
                </p>
              ))}
              <div className="form-stack mt-3">
                <Textarea
                  label="Clarification / Next Action"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
                <Select
                  label="Owner / Authority"
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
                  onClick={() =>
                    run(() => {
                      update(c.id, {
                        type: "clarify",
                        gapId: gap.id,
                        text: note,
                        owner,
                      });
                      setNote("");
                      toast("Đã thêm clarification; Gap chưa tự Resolved.");
                    })
                  }
                >
                  Thêm Clarification
                </Button>
              </div>
            </section>
            <section className="detail-section">
              <h3>Resolution record</h3>
              {gap.resolution && (
                <p>
                  {gap.resolution.basis} · {gap.resolution.authorityId} ·{" "}
                  {gap.resolution.sourceVersions.join(", ")}
                </p>
              )}
              <div className="form-stack mt-3">
                <Select
                  label="Evidence cho Resolution"
                  value={evidenceId}
                  onChange={(e) => setEvidenceId(e.target.value)}
                >
                  <option value="">Chọn evidence</option>
                  {gap.evidenceIds.map((id) => (
                    <option key={id} value={id}>
                      {id} ·{" "}
                      {c.discovery.evidence.find((e) => e.id === id)?.status}
                    </option>
                  ))}
                </Select>
                <Textarea
                  label="Căn cứ quyết định / Resolution"
                  value={basis}
                  onChange={(e) => setBasis(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={() =>
                    run(() => {
                      update(c.id, {
                        type: "resolve",
                        gapId: gap.id,
                        evidenceId,
                        authorityId: owner,
                        basis,
                      });
                      toast("Đã ghi Resolution; giữ các nguồn và phiên bản.");
                    })
                  }
                >
                  Ghi Resolution
                </Button>
              </div>
            </section>
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </Drawer>
    </Card>
  );
}
