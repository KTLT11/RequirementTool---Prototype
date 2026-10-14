import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, X } from "lucide-react";
const ToastContext = createContext<((message: string) => void) | null>(null);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; id: number } | null>(
    null,
  );
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <ToastContext.Provider
      value={(message) => setToast({ message, id: Date.now() })}
    >
      {children}
      <div
        className="toast-region"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {toast && (
          <div className="toast">
            <CheckCircle2 size={20} />
            <p>{toast.message}</p>
            <button
              className="toast-close"
              type="button"
              aria-label="Đóng thông báo"
              onClick={() => setToast(null)}
            >
              <X size={18} />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used in ToastProvider");
  return show;
}
