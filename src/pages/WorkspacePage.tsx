import { useState } from "react";
import {
  Link,
  useParams,
  Navigate,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useApp } from "../context/AppContext";
import { casePath, workspaceSections } from "../app/navigation";
import type { SectionSlug } from "../app/navigation";
import {
  Button,
  Card,
  EmptyState,
  LoadingState,
  Badge,
} from "../components/ui/primitives";
import { CaseStatusBadge } from "../components/domain/CaseStatusBadge";
import { ContextPanel } from "../components/domain/ContextPanel";
import { CaseForm, ResetDialog } from "../components/domain/CaseDialogs";
import { EvidencePanel } from "../components/domain/EvidencePanel";
import {
  OverviewV2,
  RequestSources,
  ConnectedDiscovery,
  ConfirmationHandoff,
} from "../components/domain/V2Workspace";
import {
  RequirementWorkspace,
  QualityWorkspace,
} from "../components/domain/RequirementWorkspace";
import { stageLabels } from "../data/cases";
import { ux } from "../services/uxService";
export function WorkspacePage({ section }: { section: SectionSlug }) {
  const { caseId } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { cases, status, error, reload, persistenceError } = useApp();
  const [editing, setEditing] = useState(false),
    [resetting, setResetting] = useState(false),
    [limit, setLimit] = useState(10);
  const c = cases.find((c) => c.id === caseId);
  const def = workspaceSections.find((s) => s.slug === section)!;
  if (status === "loading")
    return (
      <div className="page-container">
        <LoadingState />
      </div>
    );
  if (status === "error")
    return (
      <div className="page-container">
        <EmptyState
          title="Không thể mở workspace"
          description={error ?? "Không tải được Case."}
          action={<Button onClick={reload}>Thử lại</Button>}
        />
      </div>
    );
  if (!c) return <NotFoundPage caseMissing />;
  return (
    <div className="page-container workspace-page v2-page">
      <div className="v2-case-header">
        <div>
          <div className="case-meta">
            <span>{c.id}</span>
            <span>Working v{c.version}</span>
            <CaseStatusBadge status={c.status} />
          </div>
          <h1>{c.name}</h1>
        </div>
        <div className="heading-actions">
          <Link className="btn btn-secondary" to={casePath(c.id, "continue")}>
            Tiếp tục Case
          </Link>
          <Button variant="ghost" onClick={() => setEditing(true)}>
            Chỉnh sửa Case
          </Button>
          {c.isDemo && (
            <Button variant="ghost" onClick={() => setResetting(true)}>
              Reset Demo
            </Button>
          )}
        </div>
      </div>
      <div className="workspace-controls v2-workspace-controls">
        <Badge>Current Business Stage: {stageLabels[c.currentStage]}</Badge>
        {ux(c).replayFrom && (
          <span className="small muted">
            Vị trí replay sau reset · không phải approval
          </span>
        )}
      </div>
      {persistenceError && (
        <p className="field-error" role="alert">
          {persistenceError}
        </p>
      )}
      {params
        .get("returnTo")
        ?.startsWith(`/cases/${encodeURIComponent(c.id)}/`) && (
        <Link className="task-return" to={params.get("returnTo")!}>
          ← Quay lại task đang làm
        </Link>
      )}
      <div className="section-title">
        <h2>{def.title}</h2>
        <span className="small muted">
          {def.phase > 3
            ? "Interactive preview · business state giữ riêng"
            : "BA workspace"}
        </span>
      </div>
      {section === "overview" && <OverviewV2 workCase={c} />}
      {section === "sources" && (
        <RequestSources workCase={c} onEdit={() => setEditing(true)} />
      )}
      {section === "context" && <ContextPanel workCase={c} />}
      {section === "discovery" && <ConnectedDiscovery workCase={c} />}
      {section === "evidence" && <EvidencePanel workCase={c} />}
      {section === "requirements" && <RequirementWorkspace workCase={c} />}
      {section === "quality" && <QualityWorkspace workCase={c} />}
      {section === "customer" && (
        <ConfirmationHandoff key="customer" workCase={c} />
      )}
      {section === "handoff" && (
        <ConfirmationHandoff key="handoff" workCase={c} handoff />
      )}
      {section === "history" && (
        <Card>
          <div className="card-heading">
            <h3>Hoạt động và thay đổi của Case</h3>
          </div>
          <div className="card-content activity-list">
            {[...c.history]
              .reverse()
              .slice(0, limit)
              .map((item) => (
                <section key={item.id}>
                  <h3>{item.action}</h3>
                  <p className="small muted">
                    {new Date(item.date).toLocaleString("vi-VN", {
                      timeZone: "Australia/Brisbane",
                    })}{" "}
                    · {stageLabels[item.stage]}
                  </p>
                </section>
              ))}
            {!c.history.length && <p>Chưa có hoạt động.</p>}
            {limit < c.history.length && (
              <Button
                variant="secondary"
                onClick={() => setLimit((n) => n + 10)}
              >
                Xem thêm hoạt động
              </Button>
            )}
          </div>
        </Card>
      )}
      {editing && <CaseForm workCase={c} onClose={() => setEditing(false)} />}
      {resetting && (
        <ResetDialog workCase={c} onClose={() => setResetting(false)} />
      )}
    </div>
  );
}
export function CaseIndexRedirect() {
  const { caseId } = useParams();
  return <Navigate replace to={casePath(caseId ?? "")} />;
}
export function LegacyConfirmationRedirect() {
  const { caseId } = useParams();
  return <Navigate replace to={casePath(caseId ?? "", "customer")} />;
}
export function NotFoundPage({
  caseMissing = false,
}: {
  caseMissing?: boolean;
}) {
  return (
    <div className="page-container">
      <EmptyState
        title={caseMissing ? "Không tìm thấy Case" : "Trang không tồn tại"}
        description="Mở lại một Case hợp lệ trong danh sách."
        action={
          <Link className="btn btn-primary" to="/cases">
            Về Case List
          </Link>
        }
      />
    </div>
  );
}
