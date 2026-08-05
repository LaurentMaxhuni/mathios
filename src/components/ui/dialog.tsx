"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  trigger: React.ReactElement<{ onClick?: React.MouseEventHandler }> | string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Dialog({ trigger, title, description, children }: DialogProps) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const triggerElement =
    typeof trigger === "string" ? (
      <button
        type="button"
        className="rounded-md border px-3 py-2 text-sm"
        onClick={() => setOpen(true)}
      >
        {trigger}
      </button>
    ) : (
      React.cloneElement(trigger, { onClick: () => setOpen(true) })
    );

  return (
    <>
      {triggerElement}
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4"
          onMouseDown={() => setOpen(false)}
        >
          <section
            aria-describedby={description ? "dialog-description" : undefined}
            aria-labelledby="dialog-title"
            aria-modal="true"
            className={cn("w-full max-w-lg rounded-xl border bg-card p-6 shadow-2xl")}
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="dialog-title" className="text-lg font-semibold">
                  {title}
                </h2>
                {description ? (
                  <p id="dialog-description" className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Close dialog"
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
