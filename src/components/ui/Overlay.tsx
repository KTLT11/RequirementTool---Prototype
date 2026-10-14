import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./primitives";

export function Overlay({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  kind = "modal",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  kind?: "modal" | "drawer";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const element = ref.current;
    if (!element || !open) return;
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (!element.open) element.showModal();
    return () => {
      element.close();
      trigger?.focus();
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={`overlay overlay-${kind}`}
      aria-labelledby={headingId}
      aria-describedby={description ? descriptionId : undefined}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
          ),
        ).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first || !last) {
          event.preventDefault();
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) {
          const bounds = ref.current.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            onClose();
        }
      }}
    >
      <div className="overlay-heading">
        <div>
          <h2 id={headingId}>{title}</h2>
          {description && <p id={descriptionId}>{description}</p>}
        </div>
        <Button variant="ghost" aria-label="Đóng" onClick={onClose}>
          <X size={19} />
        </Button>
      </div>
      <div className="overlay-body">{children}</div>
      {footer && <div className="overlay-footer">{footer}</div>}
    </dialog>
  );
}
export function Modal(props: Omit<Parameters<typeof Overlay>[0], "kind">) {
  return <Overlay {...props} />;
}
export function Drawer(props: Omit<Parameters<typeof Overlay>[0], "kind">) {
  return <Overlay {...props} kind="drawer" />;
}
