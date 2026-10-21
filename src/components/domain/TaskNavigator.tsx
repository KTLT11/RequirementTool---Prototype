import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { WorkCase, Stage } from "../../types/case";
import type { GuidedTask } from "../../services/taskService";
import {
  alternativeTasks,
  browseTasks,
  taskEntity,
  taskWorkspacePath,
} from "../../services/taskNavigator";
import type { TaskStatusFilter } from "../../services/taskNavigator";
import { stageOrder, stageLabels } from "../../data/cases";
import { Button, TextInput, Select } from "../ui/primitives";
import { Drawer } from "../ui/Overlay";

export function TaskNavigator({
  c,
  current,
  tasks,
  recommended,
  frontier,
  returnTo,
}: {
  c: WorkCase;
  current: GuidedTask;
  tasks: GuidedTask[];
  recommended?: GuidedTask;
  frontier: string;
  returnTo?: { path: string; title: string };
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [stage, setStage] = useState<Stage | "all">("all"),
    [status, setStatus] = useState<TaskStatusFilter>("all");
  const [params] = useSearchParams(),
    nav = useNavigate();
  const short = alternativeTasks(tasks, current, recommended, frontier);
  const results = browseTasks(c, tasks, query, stage, status);
  const workspacePath = (t: GuidedTask) => taskWorkspacePath(c.id, t, params);
  const choose = (
    event: React.MouseEvent<HTMLAnchorElement>,
    t: GuidedTask,
  ) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    setOpen(false);
    nav(workspacePath(t));
  };
  const row = (t: GuidedTask, full: boolean) => (
    <li key={t.id} className="task-nav-item">
      <Link
        to={workspacePath(t)}
        onClick={(e) => choose(e, t)}
        aria-current={t.id === current.id ? "page" : undefined}
      >
        <strong>{t.goal}</strong>
        <span className="task-nav-meta">
          {stageLabels[t.stage]} ·{" "}
          {t.complete
            ? "Đã đáp ứng"
            : t.available
              ? "Có thể làm"
              : "Đang bị chặn"}
          {t.id === current.id ? " · Đang xem" : ""}
        </span>
        <span className="task-nav-entity">{taskEntity(c, t)}</span>
        {full && !t.available && !t.complete && (
          <span className="task-nav-blocker">
            {[...new Set([...t.preconditions, ...t.blockers])].join(" · ") ||
              "Chưa đáp ứng điều kiện của task. Mở task để xem căn cứ hiện tại."}
          </span>
        )}
      </Link>
    </li>
  );
  return (
    <section className="task-navigator" aria-label="Điều hướng công việc">
      <h3>Công việc tiếp theo</h3>
      {recommended ? (
        <div className="task-nav-recommended">
          <strong>{recommended.goal}</strong>
          <p className="task-nav-meta">{taskEntity(c, recommended)}</p>
          {recommended.id === current.id ? (
            <>
              <p>
                Đây là nhiệm vụ đang làm. Hoàn tất thao tác và điều kiện ở trên
                để tiếp tục.
              </p>
              <a className="btn btn-primary" href="#guided-task-action">
                Thực hiện nhiệm vụ hiện tại
              </a>
            </>
          ) : (
            <Button onClick={() => nav(workspacePath(recommended))}>
              Tiếp tục: {recommended.goal}
            </Button>
          )}
        </div>
      ) : (
        <p>
          Chưa có nhiệm vụ được đề xuất. Xem công việc hoặc dữ liệu Case để kiểm
          tra điều kiện còn thiếu.
        </p>
      )}
      {returnTo && (
        <Link className="text-link task-nav-return" to={returnTo.path}>
          Quay lại: {returnTo.title}
        </Link>
      )}
      <h3>Công việc khác có thể làm</h3>
      {short.length ? (
        <ul className="task-nav-short" aria-label="Công việc khác có thể làm">
          {short.map((t) => row(t, false))}
        </ul>
      ) : (
        <p>Chưa có công việc khác phù hợp với bước hiện tại.</p>
      )}
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Xem tất cả công việc
      </Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Tất cả công việc"
        description="Tra cứu nhiệm vụ theo giai đoạn và điều kiện. Chọn nhiệm vụ để mở; việc xem không thay đổi business stage."
      >
        <div className="task-browser">
          <div className="task-browser-filters">
            <TextInput
              label="Tìm công việc"
              placeholder="Tên công việc, câu hỏi, requirement hoặc mã…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="task-browser-filter-row">
              <Select
                label="Giai đoạn"
                value={stage}
                onChange={(e) => setStage(e.target.value as Stage | "all")}
              >
                <option value="all">Tất cả giai đoạn</option>
                {stageOrder.map((s) => (
                  <option key={s} value={s}>
                    {stageLabels[s]}
                  </option>
                ))}
              </Select>
              <Select
                label="Trạng thái công việc"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatusFilter)}
              >
                <option value="all">Tất cả</option>
                <option value="available">Có thể làm</option>
                <option value="blocked">Đang bị chặn</option>
              </Select>
            </div>
            <p className="task-nav-meta" role="status">
              {results.length} / {tasks.length} công việc
            </p>
          </div>
          {results.length ? (
            <ul
              className="task-browser-list"
              aria-label="Danh sách tất cả công việc"
            >
              {results.map((t) => row(t, true))}
            </ul>
          ) : (
            <p>Không có công việc phù hợp. Thử từ khóa khác hoặc bỏ bộ lọc.</p>
          )}
        </div>
      </Drawer>
    </section>
  );
}
