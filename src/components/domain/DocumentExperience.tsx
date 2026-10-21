import { useState } from "react";
import type { WorkCase, DocumentSection } from "../../types/case";
import { useApp } from "../../context/AppContext";
import { casePath } from "../../app/navigation";
import {
  buildCrdSections,
  buildDrdSections,
} from "../../services/documentService";
import { requirementQuality } from "../../services/requirementService";
import { Button, Card, Select } from "../ui/primitives";
import { SectionSwitcher } from "../ui/SectionSwitcher";
import { Link } from "react-router-dom";

type Mode = "workspace" | "preview" | "history";

function renderBody(body: string) {
  const lines = body.split("\n").filter((l) => l.trim().length > 0);
  const blocks: { type: "p" | "ul"; lines: string[] }[] = [];
  for (const line of lines) {
    const isListItem = /^\s*-\s+/.test(line);
    const last = blocks.at(-1);
    if (isListItem && last?.type === "ul") last.lines.push(line.replace(/^\s*-\s+/, ""));
    else if (isListItem) blocks.push({ type: "ul", lines: [line.replace(/^\s*-\s+/, "")] });
    else blocks.push({ type: "p", lines: [line] });
  }
  return blocks.map((b, i) =>
    b.type === "ul" ? (
      <ul key={i}>
        {b.lines.map((l, j) => (
          <li key={j}>{l}</li>
        ))}
      </ul>
    ) : (
      <p key={i} className="preserve-lines">
        {b.lines.join("\n")}
      </p>
    ),
  );
}

/**
 * CRD/DRD document experience: three explicit modes (Workspace, Preview,
 * Snapshot History) over the same section data from documentService.ts.
 * Presentation only — section content, applicability and snapshot
 * immutability are unchanged.
 */
export function DocumentExperience({
  workCase: c,
  defaultAudience = "CRD",
  scopeReqIds,
}: {
  workCase: WorkCase;
  defaultAudience?: "CRD" | "DRD";
  scopeReqIds: string[];
}) {
  const { update } = useApp();
  const [audience, setAudience] = useState<"CRD" | "DRD">(defaultAudience);
  const [mode, setMode] = useState<Mode>("preview");
  const [snapshotId, setSnapshotId] = useState<string>("live");
  const liveSections =
    audience === "CRD"
      ? buildCrdSections(c, scopeReqIds)
      : buildDrdSections(c, scopeReqIds);
  const snapshots = c.snapshots.filter((s) => s.audience === audience);
  const viewingSnapshot = snapshots.find((s) => s.id === snapshotId);
  const shown: DocumentSection[] =
    snapshotId === "live" ? liveSections : viewingSnapshot?.sections ?? liveSections;
  const applying = shown.filter((s) => s.applies);

  const notReady = scopeReqIds.filter(
    (id) => requirementQuality(c, id) !== "Quality Ready",
  );
  const reviewed =
    (c.confirmation.outcome === "Confirmed" ||
      c.confirmation.outcome === "Partially Confirmed") &&
    c.confirmation.snapshotId !== null &&
    c.confirmation.snapshotId === (snapshotId !== "live" ? snapshotId : null);

  return (
    <Card>
      <div className="card-heading">
        <div>
          <h3>{audience} Document Experience</h3>
          <p>Scope: {scopeReqIds.join(", ") || "Chưa chọn Requirement."}</p>
        </div>
        <Select
          label="Loại tài liệu"
          value={audience}
          onChange={(e) => {
            setAudience(e.target.value as "CRD" | "DRD");
            setSnapshotId("live");
          }}
        >
          <option>CRD</option>
          <option>DRD</option>
        </Select>
      </div>
      <div className="card-content">
        <div className="document-mode-switcher">
          <SectionSwitcher
            label="Document mode"
            value={mode}
            onChange={(v) => setMode(v as Mode)}
            items={[
              { value: "workspace", label: "Document Workspace" },
              { value: "preview", label: "Document Preview" },
              { value: "history", label: "Snapshot History" },
            ]}
          />
        </div>

        {mode === "workspace" && (
          <div className="panel-stack">
            <p className="small muted">
              Structure, scope và completeness của {audience} —{" "}
              {audience === "CRD" ? "10 sections C01–C10" : "12 section slots D01–D12"}.
            </p>
            <div className="document-workspace-list">
              {shown.map((s) =>
                s.applies ? (
                  <a className="trace-item" href={`#${audience}-${s.code}`} key={s.code}>
                    <strong>
                      {s.code} · {s.title}
                    </strong>
                  </a>
                ) : (
                  <p className="applicability-row" key={s.code}>
                    {s.code} · {s.title}{" "}
                    <span>Không áp dụng — section conditional không xuất thành chapter rỗng.</span>
                  </p>
                ),
              )}
            </div>
            {notReady.length > 0 && (
              <div className="confirmation-not-ready">
                <h3>Outstanding / missing information</h3>
                <ul>
                  {notReady.map((id) => (
                    <li key={id}>
                      {id}: Quality {requirementQuality(c, id)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="small muted">
              Linked Requirements: {scopeReqIds.join(", ") || "—"} · Working version v{c.version} ·{" "}
              {snapshots.length} snapshot{snapshots.length === 1 ? "" : "s"} đã tạo cho {audience}.
            </p>
            <Link className="text-link" to={`${casePath(c.id, "requirements")}?tab=trace`}>
              Xem nguồn của requirement / rule →
            </Link>
          </div>
        )}

        {mode === "preview" && (
          <div className="panel-stack">
            <div className="snapshot-banner">
              {snapshotId === "live"
                ? `Draft hiện tại (working v${c.version}) — phản ánh canonical state; chưa phải bản gửi review.`
                : `Đang xem Snapshot immutable ${viewingSnapshot?.id} · v${viewingSnapshot?.version} · nội dung giữ nguyên dù source đã thay đổi.`}
            </div>
            <div className="document-page">
              <div className="document-title-block">
                <h2>
                  {c.name} — {audience}
                </h2>
                <div className="meta-row">
                  <span>Case: {c.id}</span>
                  <span>
                    Version:{" "}
                    {snapshotId === "live" ? `working v${c.version}` : `snapshot v${viewingSnapshot?.version}`}
                  </span>
                  <span>Scope: {scopeReqIds.join(", ") || "—"}</span>
                  <span>
                    Status:{" "}
                    {snapshotId === "live"
                      ? "Draft"
                      : reviewed
                        ? "Reviewed"
                        : "Snapshot"}
                  </span>
                </div>
              </div>
              <nav className="document-toc" aria-label="Mục lục">
                <strong>Mục lục</strong>
                {applying.map((s) => (
                  <a key={s.code} href={`#${audience}-${s.code}`}>
                    {s.code} · {s.title}
                  </a>
                ))}
              </nav>
              {applying.map((s) => (
                <section className="document-section" id={`${audience}-${s.code}`} key={s.code}>
                  <h3>
                    {s.code} · {s.title}
                  </h3>
                  {renderBody(s.body)}
                </section>
              ))}
            </div>
            <Button
              variant="secondary"
              disabled={!scopeReqIds.length}
              onClick={() =>
                update(c.id, {
                  type: "snapshot",
                  audience,
                  scopeReqIds,
                })
              }
            >
              Tạo Snapshot {audience} từ scope hiện tại
            </Button>
          </div>
        )}

        {mode === "history" && (
          <div className="panel-stack">
            {!snapshots.length ? (
              <p className="small muted">
                Chưa có snapshot {audience} nào được tạo. Snapshot là bản ghi immutable, không ghi đè bản cũ.
              </p>
            ) : (
              <div className="snapshot-history-list">
                <button
                  type="button"
                  className="snapshot-history-row"
                  aria-current={snapshotId === "live"}
                  onClick={() => setSnapshotId("live")}
                >
                  <span>Draft hiện tại (live)</span>
                  <span>working v{c.version}</span>
                </button>
                {snapshots.map((s) => (
                  <button
                    type="button"
                    className="snapshot-history-row"
                    key={s.id}
                    aria-current={snapshotId === s.id}
                    onClick={() => setSnapshotId(s.id)}
                  >
                    <span>
                      {s.id} · scope {s.scopeReqIds.join(", ")}
                    </span>
                    <span>
                      v{s.version} · {new Date(s.createdAt).toLocaleString()}
                      {s.version !== c.version ? " · case đã thay đổi sau snapshot" : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
