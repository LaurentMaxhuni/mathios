"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFocusableElements } from "@/lib/focus";

interface DialogProps {
  trigger: React.ReactElement | string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Dialog({ trigger, title, description, children }: DialogProps) {
  const [open, setOpen] = React.useState(false);
  const titleId = React.useId().replaceAll(":", "");
  const descriptionId = `${titleId}-description`;
  const dialogId = `${titleId}-dialog`;
  const dialogRef = React.useRef<HTMLElement>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  const restoreFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => {
      const focusable = dialogRef.current ? getFocusableElements(dialogRef.current) : [];
      (focusable[0] ?? closeButtonRef.current ?? dialogRef.current)?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = getFocusableElements(dialogRef.current);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  React.useEffect(() => {
    if (open) return;
    const restore = restoreFocusRef.current;
    if (restore && document.contains(restore)) restore.focus();
    restoreFocusRef.current = null;
  }, [open]);

  const triggerElement =
    typeof trigger === "string" ? (
      <button
        type="button"
        className="rounded-md border px-3 py-2 text-sm"
        aria-controls={dialogId}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {trigger}
      </button>
    ) : (
      React.cloneElement(trigger, {
        onClick: (event: React.MouseEvent) => {
          const existingOnClick = (trigger.props as { onClick?: React.MouseEventHandler }).onClick;
          existingOnClick?.(event);
          setOpen(true);
        },
        "aria-controls": dialogId,
        "aria-expanded": open,
        "aria-haspopup": "dialog",
      } as Partial<React.ComponentPropsWithoutRef<"button">>)
    );

  return (
    <>
      {triggerElement}
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            ref={dialogRef}
            id={dialogId}
            aria-describedby={description ? descriptionId : undefined}
            aria-labelledby={titleId}
            aria-modal="true"
            className={cn("w-full max-w-lg rounded-xl border bg-card p-6 shadow-2xl")}
            role="dialog"
            tabIndex={-1}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={titleId} className="text-lg font-semibold">
                  {title}
                </h2>
                {description ? (
                  <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Close dialog"
                ref={closeButtonRef}
                className="rounded-md p-1 hover:bg-muted"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-5">{children}</div>
          </section>
        </div>
      ) : null}
    </>
  );
}
