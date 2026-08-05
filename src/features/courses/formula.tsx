"use client";

import * as React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FormulaDisplay({
  latex,
  accessibleLabel,
  block = true,
}: {
  latex: string;
  accessibleLabel: string;
  block?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  const renderedFormula = React.useMemo(
    () =>
      katex.renderToString(latex, {
        displayMode: block,
        throwOnError: false,
        output: "htmlAndMathml",
        trust: false,
      }),
    [block, latex],
  );
  async function copyFormula() {
    try {
      await navigator.clipboard.writeText(latex);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div
      className={
        block ? "my-4 rounded-xl border bg-muted/50 p-4" : "inline-flex items-center gap-2"
      }
      role="math"
      aria-label={accessibleLabel}
      data-formula={latex}
    >
      <span
        aria-hidden="true"
        className="min-w-0 overflow-x-auto text-accent"
        dangerouslySetInnerHTML={{ __html: renderedFormula }}
      />
      {block ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={copyFormula}
          aria-label="Copy formula"
        >
          {copied ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      ) : null}
      <span className="sr-only">{accessibleLabel}</span>
    </div>
  );
}
