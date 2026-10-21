import { useEffect, useState } from "react";
import {
  NavLink,
  Outlet,
  Link,
  useLocation,
  useParams,
} from "react-router-dom";
import {
  FolderOpen,
  Layers3,
  ChevronRight,
  Menu,
  PanelLeftClose,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { DEMO_CASE_ID } from "../../data/cases";
import { workspaceSections, casePath } from "../../app/navigation";
import { Button } from "../ui/primitives";
import { Drawer } from "../ui/Overlay";

export function AppShell() {
  const { caseId } = useParams();
  const location = useLocation();
  const { cases } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const currentCase = cases.find((item) => item.id === caseId);
  const section = workspaceSections.find((item) =>
    location.pathname.endsWith(`/${item.slug}`),
  );
  const mode = location.pathname.endsWith("/continue")
    ? "Continue Case"
    : location.pathname.endsWith("/explore")
      ? "Explore Workflow"
      : "Dữ liệu Case";
  const activeTitle = caseId ? (section?.label ?? mode) : "Case List";
  useEffect(() => {
    document.title = `${activeTitle} · Requirement Tool`;
    setMobileOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname, activeTitle]);
  const sidebar = (
    <>
      <Link
        to="/cases"
        className="brand"
        aria-label="Requirement Tool — Case List"
      >
        <span className="brand-mark">
          <Layers3 size={22} />
        </span>
        <strong>Requirement Tool</strong>
      </Link>
      <div className="sidebar-links">
        <span className="nav-caption">WORKSPACE</span>
        <NavLink end to="/cases" className="side-link">
          <FolderOpen size={19} />
          <span>Case List</span>
        </NavLink>
        <div className="nav-divider" />
        <span className="nav-caption">{caseId ? "CURRENT CASE" : "CASE"}</span>
        <Link
          className="case-shortcut"
          to={casePath(currentCase?.id ?? DEMO_CASE_ID)}
        >
          <span className="case-shortcut-id">
            {currentCase?.id ?? DEMO_CASE_ID}
          </span>
          <span>
            {currentCase?.name ?? "Refund Request Processing Improvement"}
          </span>
        </Link>
        <nav aria-label="Case Workspace">
          {[
            { slug: "continue", label: "Continue Case", icon: Layers3 },
            { slug: "explore", label: "Explore Workflow", icon: FolderOpen },
            { slug: "data", label: "Dữ liệu Case", icon: FolderOpen },
          ].map((item) => (
            <NavLink
              key={item.slug}
              className={`side-link ${item.slug === "data" && !!section ? "active" : ""}`}
              to={casePath(
                caseId ?? DEMO_CASE_ID,
                item.slug as "continue" | "explore" | "data",
              )}
            >
              <item.icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <span className="avatar">BA</span>
          <div>
            <strong>BA Workspace</strong>
            <small>Business Analyst</small>
          </div>
        </div>
      </div>
    </>
  );
  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <a className="skip-link" href="#main-content">
        Đến nội dung chính
      </a>
      <aside className="sidebar" aria-label="Điều hướng chính">
        {sidebar}
      </aside>
      <div className="shell-body">
        <header className="topbar">
          <div className="topbar-context">
            <Button
              variant="ghost"
              className="mobile-menu"
              aria-label="Mở điều hướng"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </Button>
            <Button
              variant="ghost"
              className="desktop-menu"
              aria-label={
                collapsed ? "Mở thanh điều hướng" : "Thu gọn thanh điều hướng"
              }
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((value) => !value)}
            >
              <PanelLeftClose size={19} />
            </Button>
            <nav aria-label="Breadcrumb" className="breadcrumbs">
              <Link to="/cases">Cases</Link>
              {caseId && (
                <>
                  <ChevronRight size={14} />
                  <Link to={casePath(caseId)}>{caseId}</Link>
                  <ChevronRight size={14} />
                  <span aria-current="page">{activeTitle}</span>
                </>
              )}
            </nav>
          </div>
          <div className="header-actions">
            <span className="environment-indicator">Demo Environment</span>
            <span className="avatar avatar-small" aria-label="Business Analyst">
              BA
            </span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>Requirement Tool</span>
        </footer>
      </div>
      <Drawer
        title="Điều hướng"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      >
        <div className="mobile-sidebar">{sidebar}</div>
      </Drawer>
    </div>
  );
}
