import { Link, useLocation } from "react-router-dom";
import type { WorkCase } from "../../types/case";
import { ux } from "../../services/uxService";
import { layer2, requirementQuality } from "../../services/requirementService";
import { questions } from "../../data/questions";
import { casePath } from "../../app/navigation";
export function entityPath(c: WorkCase, kind: string, id: string) {
  const base = casePath(c.id, "overview").replace("/overview", "");
  if (kind === "document" || kind === "extracted")
    return `${base}/sources?${kind}=${encodeURIComponent(id)}`;
  if (kind === "question")
    return `${base}/discovery?question=${encodeURIComponent(id)}`;
  if (kind === "evidence")
    return `${base}/evidence?evidence=${encodeURIComponent(id)}`;
  if (kind === "gap")
    return `${base}/evidence?view=${c.discovery.gaps.find((g) => g.id === id)?.type === "Conflict" ? "conflicts" : "gaps"}&gap=${encodeURIComponent(id)}`;
  if (kind === "finding")
    return `${base}/quality?finding=${encodeURIComponent(id)}`;
  if (kind === "ac") {
    const r =
      layer2(c).requirements.find(
        (r) => r.status !== "Archived" && r.ac.some((a) => a.id === id),
      ) ?? layer2(c).requirements.find((r) => r.ac.some((a) => a.id === id));
    return `${base}/requirements?requirement=${encodeURIComponent(r?.id || "")}&tab=ac&ac=${encodeURIComponent(id)}`;
  }
  return `${base}/requirements?requirement=${encodeURIComponent(id)}&tab=trace`;
}
export function TraceabilityPanel({
  workCase: c,
  kind,
  id,
}: {
  workCase: WorkCase;
  kind: string;
  id: string;
}) {
  const loc = useLocation(),
    original = new URLSearchParams(loc.search).get("returnTo"),
    origin = original?.startsWith(`/cases/${encodeURIComponent(c.id)}/`)
      ? original
      : loc.pathname + loc.search;
  const u = ux(c),
    l = layer2(c);
  let qids: string[] = [];
  let rids: string[] = [];
  if (kind === "requirement") rids = [id];
  if (kind === "ac")
    rids = l.requirements
      .filter((r) => r.ac.some((a) => a.id === id))
      .map((r) => r.id);
  if (kind === "finding")
    rids = l.results.filter((r) => r.id === id).map((r) => r.requirementId);
  if (kind === "question") qids = [id];
  if (kind === "gap")
    qids = c.discovery.gaps.filter((g) => g.id === id).map((g) => g.questionId);
  if (kind === "evidence")
    qids = c.discovery.evidence
      .filter((e) => e.id === id)
      .map((e) => e.questionId);
  if (kind === "extracted")
    qids = u.extracted.filter((e) => e.id === id).map((e) => e.questionId);
  if (kind === "document")
    qids = u.extracted
      .filter((e) => e.documentId === id)
      .map((e) => e.questionId);
  if (rids.length)
    qids = [
      ...new Set(
        l.requirements
          .filter((r) => rids.includes(r.id))
          .flatMap((r) => [
            ...r.questionIds,
            ...c.discovery.evidence
              .filter(
                (e) =>
                  r.evidenceIds.includes(e.id) ||
                  r.ac.some((a) => a.evidenceIds.includes(e.id)),
              )
              .map((e) => e.questionId),
          ]),
      ),
    ];
  const related = l.requirements.filter(
    (r) =>
      rids.includes(r.id) ||
      r.questionIds.some((q) => qids.includes(q)) ||
      r.evidenceIds.includes(id) ||
      r.ac.some((a) => a.evidenceIds.includes(id)),
  );
  const evidence = c.discovery.evidence.filter(
    (e) =>
      qids.includes(e.questionId) ||
      related.some((r) => r.evidenceIds.includes(e.id)),
  );
  const groups = [
    {
      label: "Nguồn đầu vào",
      items: u.documents
        .filter(
          (d) =>
            d.id === id ||
            u.extracted.some(
              (e) => e.documentId === d.id && qids.includes(e.questionId),
            ) ||
            evidence.some((e) => e.documentId === d.id),
        )
        .map((d) => ({
          kind: "document",
          id: d.id,
          title: d.name,
          status: d.status,
        })),
    },
    {
      label: "Thông tin trích xuất",
      items: u.extracted
        .filter((e) => qids.includes(e.questionId))
        .map((e) => ({
          kind: "extracted",
          id: e.id,
          title: e.value,
          status: e.status,
        })),
    },
    {
      label: "Discovery / Required Information",
      items: questions
        .filter((q) => qids.includes(q.id))
        .map((q) => ({
          kind: "question",
          id: q.id,
          title: q.question,
          status: q.infoId,
        })),
    },
    {
      label: "Evidence & Gaps",
      items: [
        ...evidence.map((e) => ({
          kind: "evidence",
          id: e.id,
          title: e.statement,
          status: `${e.status} · ${e.review}${related.some((r) => r.evidenceIds.includes(e.id) || r.ac.some((a) => a.evidenceIds.includes(e.id))) ? " · Supporting link" : " · Liên quan qua question"}`,
        })),
        ...c.discovery.gaps
          .filter((g) => qids.includes(g.questionId))
          .map((g) => ({
            kind: "gap",
            id: g.id,
            title: g.description,
            status: g.status,
          })),
      ],
    },
    {
      label: "Requirement",
      items: related.map((r) => ({
        kind: "requirement",
        id: r.id,
        title: r.title,
        status: `${r.status} · ${requirementQuality(c, r.id)}${
          c.confirmation.scopeReqIds.includes(r.id)
            ? ` · Customer: ${c.confirmation.outcome}`
            : ""
        }`,
      })),
    },
    {
      label: "Acceptance Criteria",
      items: related.flatMap((r) =>
        r.ac.map((a) => ({
          kind: "ac",
          id: a.id,
          title: a.title,
          status: `${a.status} · ${a.scenarioIds.length} scenario`,
        })),
      ),
    },
    {
      label: "Quality Findings / Evaluations",
      items: l.results
        .filter((x) => related.some((r) => r.id === x.requirementId))
        .map((x) => ({
          kind: "finding",
          id: x.id,
          title: `${x.checkId}: ${x.explanation}`,
          status: `${x.status} · ${x.freshness}`,
        })),
    },
  ];
  return (
    <div className="trace-panel">
      <p className="small muted">
        Upstream ↔ downstream theo links của Case. Nguồn Unconfirmed/Assumption
        không phải căn cứ đã xác minh.
      </p>
      {groups.map((g) => (
        <section key={g.label}>
          <h3>{g.label}</h3>
          {g.items.length ? (
            g.items.map((i) => (
              <Link
                className="trace-item"
                key={i.kind + i.id}
                to={`${entityPath(c, i.kind, i.id)}&returnTo=${encodeURIComponent(origin)}`}
              >
                <strong>{i.title}</strong>
                <span>{i.status}</span>
                <small>{i.id}</small>
              </Link>
            ))
          ) : (
            <p className="small muted">Chưa có liên kết được ghi nhận.</p>
          )}
        </section>
      ))}
      <Link className="text-link" to={casePath(c.id, "customer")}>
        Customer scope / CRD preview
      </Link>
      <Link className="text-link" to={casePath(c.id, "handoff")}>
        Readiness / DRD preview
      </Link>
    </div>
  );
}
