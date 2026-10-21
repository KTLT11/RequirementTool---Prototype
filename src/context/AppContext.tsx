import { layer2 } from "../services/requirementService";
import { ux } from "../services/uxService";
import { backfillCase } from "../services/migrationService";
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import type { ReactNode, Context } from "react";
import type { LoadStatus, WorkCase } from "../types/case";
import { caseService } from "../services/caseService";
import { transition, createCase } from "../services/caseTransitions";
import type { CaseCommand } from "../services/caseTransitions";
export const STORAGE_KEY = "requirement-tool.stage2.v1";
interface State {
  cases: WorkCase[];
  status: LoadStatus;
  error: string | null;
}
type Action =
  | { type: "loaded"; cases: WorkCase[] }
  | { type: "failed"; message: string }
  | { type: "update"; value: WorkCase }
  | { type: "create"; value: WorkCase };
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loaded":
      return { cases: action.cases, status: "ready", error: null };
    case "failed":
      return { ...state, status: "error", error: action.message };
    case "update":
      return {
        ...state,
        cases: state.cases.map((c) =>
          c.id === action.value.id ? action.value : c,
        ),
      };
    case "create":
      return { ...state, cases: [...state.cases, action.value] };
  }
}
type AppApi = State & {
  reload: () => void;
  update: (id: string, command: CaseCommand) => void;
  create: (name: string, request: string) => string;
  persistenceError: string | null;
  lastChange: { before: WorkCase; after: WorkCase } | null;
};
const AppContext: Context<AppApi | null> =
  import.meta.hot?.data.appContext ?? createContext<AppApi | null>(null);
if (import.meta.hot) import.meta.hot.data.appContext = AppContext;
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    cases: [],
    status: "loading",
    error: null,
  });
  const [revision, setRevision] = useState(0);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [lastChange, setLastChange] = useState<{
    before: WorkCase;
    after: WorkCase;
  } | null>(null);
  const latestState = useRef(state);
  latestState.current = state;
  useEffect(() => {
    const controller = new AbortController();
    caseService
      .list(controller.signal)
      .then((cases) => {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const saved = JSON.parse(raw) as {
              schema: number;
              cases: WorkCase[];
            };
            if (
              saved.schema === 1 &&
              Array.isArray(saved.cases) &&
              saved.cases.every(
                (c) =>
                  c.id && c.context && c.discovery && c.previews && c.history,
              )
            )
              cases = saved.cases;
            else throw new Error("schema");
          }
        } catch {
          setPersistenceError("Không thể đọc dữ liệu lưu; đã tải baseline.");
        }
        cases = cases.map((c) => ({
          ...backfillCase(c),
          ux: ux(c),
          layer2: layer2(c),
          context: {
            ...c.context,
            complexityProvenance:
              c.context.complexityProvenance ?? "BA-entered Information",
            hypothesisProvenance:
              c.context.hypothesisProvenance ?? "BA-entered Information",
          },
        }));
        if (!controller.signal.aborted) dispatch({ type: "loaded", cases });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          dispatch({
            type: "failed",
            message: "Không thể tải Case. Vui lòng thử lại.",
          });
      });
    return () => controller.abort();
  }, [revision]);
  useEffect(() => {
    if (state.status === "ready")
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ schema: 1, cases: state.cases }),
        );
      } catch {
        setPersistenceError(
          "Không thể lưu trên trình duyệt; thay đổi chỉ giữ trong phiên này.",
        );
      }
  }, [state.cases, state.status]);
  const update = (id: string, command: CaseCommand) => {
    const c = latestState.current.cases.find((c) => c.id === id);
    if (!c) throw new Error("Không tìm thấy Case.");
    const next = transition(c, command);
    if (next.version !== c.version) setLastChange({ before: c, after: next });
    latestState.current = {
      ...latestState.current,
      cases: latestState.current.cases.map((x) => (x.id === id ? next : x)),
    };
    dispatch({ type: "update", value: next });
  };
  const create = (name: string, request: string) => {
    const c = createCase(name, request);
    dispatch({ type: "create", value: c });
    return c.id;
  };
  return (
    <AppContext.Provider
      value={{
        ...state,
        reload: () => setRevision((v) => v + 1),
        update,
        create,
        persistenceError,
        lastChange,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
export function useApp() {
  const c = useContext(AppContext);
  if (!c) throw new Error("useApp must be used within AppProvider");
  return c;
}
