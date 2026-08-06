"use client";

import Link from "next/link";
import { FormulaDisplay } from "@/features/courses/formula";
import { parseMarkdown, type MarkdownInlineToken } from "@/domain/notes/markdown";

function Inline({ tokens }: { tokens: readonly MarkdownInlineToken[] }) {
  return (
    <>
      {tokens.map((token, index) => {
        const key = `${token.type}-${index}`;
        if (token.type === "strong") return <strong key={key}>{token.value}</strong>;
        if (token.type === "emphasis") return <em key={key}>{token.value}</em>;
        if (token.type === "code")
          return (
            <code key={key} className="rounded bg-muted px-1.5 py-0.5 text-[0.9em]">
              {token.value}
            </code>
          );
        if (token.type === "formula")
          return (
            <FormulaDisplay
              key={key}
              latex={token.value}
              accessibleLabel="Inline note formula"
              block={false}
            />
          );
        if (token.type === "link") {
          if (token.href.startsWith("/"))
            return (
              <Link key={key} href={token.href as never} className="text-accent hover:underline">
                {token.value}
              </Link>
            );
          return (
            <a
              key={key}
              href={token.href}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              {token.value}
            </a>
          );
        }
        if (token.type === "image")
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={key}
              src={token.href}
              alt={token.value || "Note image"}
              className="my-3 max-h-80 max-w-full rounded-lg border object-contain"
            />
          );
        return <span key={key}>{token.value}</span>;
      })}
    </>
  );
}

export function MarkdownPreview({ markdown }: { markdown: string }) {
  const blocks = parseMarkdown(markdown);
  if (!blocks.length)
    return <p className="text-sm italic text-muted-foreground">Nothing written yet.</p>;
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert" data-testid="note-preview">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const Heading = block.level === 1 ? "h2" : block.level === 2 ? "h3" : "h4";
          return (
            <Heading key={index} className="mt-5 font-semibold tracking-tight">
              <Inline tokens={block.tokens} />
            </Heading>
          );
        }
        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List key={index} className={block.ordered ? "list-decimal" : "list-disc"}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Inline tokens={item} />
                </li>
              ))}
            </List>
          );
        }
        if (block.type === "code")
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-xl bg-primary p-4 text-primary-foreground"
            >
              <code>{block.value}</code>
            </pre>
          );
        if (block.type === "formula")
          return (
            <FormulaDisplay key={index} latex={block.value} accessibleLabel="Block note formula" />
          );
        return (
          <p key={index} className="leading-7">
            <Inline tokens={block.tokens} />
          </p>
        );
      })}
    </div>
  );
}
