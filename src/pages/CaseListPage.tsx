import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  ArrowRight,
  SlidersHorizontal,
  Plus,
  RotateCcw,
  FileText,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { filterCases } from "../services/caseService";
import { casePath } from "../app/navigation";
import type { CaseStatus, WorkCase } from "../types/case";
import {
  Button,
  Card,
  Checkbox,
  DataTable,
  EmptyState,
  LoadingState,
  Select,
  TextInput,
  Textarea,
} from "../components/ui/primitives";
import { Modal, Drawer } from "../components/ui/Overlay";
import { useToast } from "../components/ui/Toast";
import { CaseStatusBadge } from "../components/domain/CaseStatusBadge";
import { BusinessContextDetails } from "../components/domain/BusinessContextDetails";
import { CaseForm } from "../components/domain/CaseDialogs";
import { discoveryProgress } from "../services/discoveryService";

interface Preferences {
  density: "comfortable" | "compact";
  showDescription: boolean;
  note: string;
}
export function CaseListPage() {
  const { cases, status, error, reload } = useApp();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CaseStatus | "all">("all");
  const [details, setDetails] = useState<WorkCase | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    density: "comfortable",
    showDescription: true,
    note: "",
  });
  const [draftPreferences, setDraftPreferences] = useState(preferences);
  const [creating, setCreating] = useState(false);
  const rows = filterCases(cases, search, filter);
  const hasFilters = !!search || filter !== "all";
  const clearFilters = () => {
    setSearch("");
    setFilter("all");
    toast("Đã xóa bộ lọc Case.");
  };
  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <h1>Cases</h1>
          <p className="page-description">
            Quản lý yêu cầu và tiếp tục xử lý các Case.
          </p>
        </div>
        <div className="heading-actions">
          <Button
            variant="secondary"
            onClick={() => {
              setDraftPreferences(preferences);
              setSettingsOpen(true);
            }}
          >
            <SlidersHorizontal size={18} />
            <span>Hiển thị</span>
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus size={18} />
            Tạo Case
          </Button>
        </div>
      </div>
      {preferences.note && (
        <p className="review-note">
          <strong>Ghi chú phiên review:</strong> {preferences.note}
        </p>
      )}
      <Card className="cases-card">
        <div className="card-heading">
          <h2>Danh sách Case</h2>
          <span className="muted small">
            {status === "ready" ? `${cases.length} Case` : "Đang tải"}
          </span>
        </div>
        <div className="filter-bar">
          <TextInput
            label="Tìm kiếm Case"
            placeholder="Tìm theo tên hoặc mã Case…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            leading={<Search size={17} />}
            className="search-field"
          />
          <Select
            label="Trạng thái"
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as CaseStatus | "all")
            }
          >
            <option value="all">Tất cả trạng thái</option>
            <option>In Progress</option>
            <option>Re-review Required</option>
            <option>Preparation Accepted — Blocked</option>
            <option>Requirement Preparation Completed</option>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="small" onClick={clearFilters}>
              <RotateCcw size={15} />
              Xóa bộ lọc
            </Button>
          )}
        </div>
        {status === "loading" ? (
          <LoadingState />
        ) : status === "error" ? (
          <EmptyState
            title="Không thể tải Case"
            description={error ?? "Đã có lỗi khi tải dữ liệu."}
            action={
              <Button variant="secondary" onClick={reload}>
                Thử lại
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={hasFilters ? "Không tìm thấy Case phù hợp" : "Chưa có Case"}
            description={
              hasFilters
                ? "Thử tên, mã Case hoặc chọn trạng thái khác."
                : "Chưa có Case được ghi nhận."
            }
            action={
              hasFilters && (
                <Button variant="secondary" onClick={clearFilters}>
                  Xóa bộ lọc
                </Button>
              )
            }
          />
        ) : (
          <DataTable<WorkCase>
            caption="Danh sách Case"
            rows={rows}
            rowKey={(row) => row.id}
            compact={preferences.density === "compact"}
            columns={[
              {
                key: "case",
                heading: "CASE",
                render: (row) => (
                  <div className="case-cell">
                    <span className="case-cell-icon">
                      <FileText size={21} />
                    </span>
                    <div>
                      <Link className="case-title" to={casePath(row.id)}>
                        {row.name}
                      </Link>
                      <span className="case-code">{row.id}</span>
                      {preferences.showDescription && <p>{row.summary}</p>}
                    </div>
                  </div>
                ),
              },
              {
                key: "status",
                heading: "TRẠNG THÁI",
                render: (row) => <CaseStatusBadge status={row.status} />,
              },
              {
                key: "progress",
                heading: "DISCOVERY",
                render: (row) => {
                  const p = discoveryProgress(row);
                  return (
                    <span>
                      {p.resolved}/{p.total} xác minh
                    </span>
                  );
                },
              },
              {
                key: "actions",
                heading: "THAO TÁC",
                render: (row) => (
                  <div className="table-actions">
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => setDetails(row)}
                      aria-label={`Thông tin ${row.id}`}
                    >
                      Thông tin
                    </Button>
                    <Link
                      className="btn btn-secondary btn-small"
                      to={casePath(row.id)}
                    >
                      Mở Case <ArrowRight size={15} />
                    </Link>
                  </div>
                ),
              },
            ]}
          />
        )}
        <div className="table-footer">
          <span>
            {status === "ready"
              ? `${rows.length} / ${cases.length} Case`
              : "Đang tải Case"}
          </span>
        </div>
      </Card>
      <Modal
        title="Tùy chọn hiển thị"
        description="Chỉ thay đổi giao diện của Case List trong phiên hiện tại."
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSettingsOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                setPreferences(draftPreferences);
                setSettingsOpen(false);
                toast("Đã áp dụng tùy chọn hiển thị cho phiên này.");
              }}
            >
              Áp dụng
            </Button>
          </>
        }
      >
        <div className="form-stack">
          <Select
            label="Khoảng cách dòng"
            value={draftPreferences.density}
            onChange={(event) =>
              setDraftPreferences({
                ...draftPreferences,
                density: event.target.value as Preferences["density"],
              })
            }
          >
            <option value="comfortable">Thoáng</option>
            <option value="compact">Gọn</option>
          </Select>
          <Checkbox
            label="Hiển thị mô tả ngắn của Case"
            checked={draftPreferences.showDescription}
            onChange={(event) =>
              setDraftPreferences({
                ...draftPreferences,
                showDescription: event.target.checked,
              })
            }
          />
          <Textarea
            label="Ghi chú phiên review"
            hint="Ghi chú hiển thị cá nhân; không cập nhật requirement hoặc evidence."
            value={draftPreferences.note}
            maxLength={280}
            rows={3}
            onChange={(event) =>
              setDraftPreferences({
                ...draftPreferences,
                note: event.target.value,
              })
            }
          />
        </div>
      </Modal>
      <Drawer
        title="Thông tin Case"
        description={details?.id}
        open={!!details}
        onClose={() => setDetails(null)}
        footer={
          <Button variant="secondary" onClick={() => setDetails(null)}>
            Đóng
          </Button>
        }
      >
        {details && (
          <>
            <h3 className="drawer-case-name">{details.name}</h3>
            <CaseStatusBadge status={details.status} />
            <BusinessContextDetails workCase={details} />
            <Link
              onClick={() => setDetails(null)}
              className="btn btn-primary"
              to={casePath(details.id)}
            >
              Mở Workspace <ArrowRight size={18} />
            </Link>
          </>
        )}
      </Drawer>
      {creating && <CaseForm onClose={() => setCreating(false)} />}
    </div>
  );
}
