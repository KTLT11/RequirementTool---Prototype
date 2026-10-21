import { ContinuePage, ExplorePage, DataPage } from "../pages/GuidedPages";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider } from "../context/AppContext";
import { ToastProvider } from "../components/ui/Toast";
import { AppShell } from "../components/layout/AppShell";
import { CaseListPage } from "../pages/CaseListPage";
import {
  CaseIndexRedirect,
  LegacyConfirmationRedirect,
  NotFoundPage,
  WorkspacePage,
} from "../pages/WorkspacePage";
import { workspaceSections } from "./navigation";
export function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/cases" replace />} />
            <Route element={<AppShell />}>
              <Route path="/cases" element={<CaseListPage />} />
              <Route
                path="/cases/:caseId/confirmation"
                element={<LegacyConfirmationRedirect />}
              />
              <Route path="/cases/:caseId" element={<CaseIndexRedirect />} />
              <Route
                path="/cases/:caseId/continue"
                element={<ContinuePage />}
              />
              <Route path="/cases/:caseId/explore" element={<ExplorePage />} />
              <Route path="/cases/:caseId/data" element={<DataPage />} />
              {workspaceSections.map((section) => (
                <Route
                  key={section.slug}
                  path={`/cases/:caseId/${section.slug}`}
                  element={
                    section.slug === "overview" ? (
                      <CaseIndexRedirect />
                    ) : (
                      <WorkspacePage section={section.slug} />
                    )
                  }
                />
              ))}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AppProvider>
  );
}
