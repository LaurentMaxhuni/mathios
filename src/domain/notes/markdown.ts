export type MarkdownInlineToken =
  | { type: "text"; value: string }
  | { type: "strong"; value: string }
  | { type: "emphasis"; value: string }
  | { type: "code"; value: string }
  | { type: "formula"; value: string }
  | { type: "link"; value: string; href: string }
  | { type: "image"; value: string; href: string };

export type MarkdownBlock =
  | { type: "paragraph"; tokens: readonly MarkdownInlineToken[] }
  | { type: "heading"; level: number; tokens: readonly MarkdownInlineToken[] }
  | { type: "list"; ordered: boolean; items: readonly MarkdownInlineToken[][] }
  | { type: "code"; value: string }
  | { type: "formula"; value: string };

export function safeMarkdownUrl(value: string, image = false): string | null {
  const url = value.trim();
  if (url.startsWith("/") || url.startsWith("#")) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (image && /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i.test(url)) return url;
  return null;
}

export function parseMarkdownInline(value: string): MarkdownInlineToken[] {
  const tokens: MarkdownInlineToken[] = [];
  const pattern =
    /(\!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_|`([^`]+)`|(\$\$?)([^$]+?)\$\$?)/g;
  let lastIndex = 0;
  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) tokens.push({ type: "text", value: value.slice(lastIndex, index) });
    if (match[2] !== undefined && match[3] !== undefined) {
      const href = safeMarkdownUrl(match[3], true);
      if (href) tokens.push({ type: "image", value: match[2], href });
      else tokens.push({ type: "text", value: match[0] });
    } else if (match[4] !== undefined && match[5] !== undefined) {
      const href = safeMarkdownUrl(match[5]);
      if (href) tokens.push({ type: "link", value: match[4], href });
      else tokens.push({ type: "text", value: match[0] });
    } else if (match[6] !== undefined || match[7] !== undefined) {
      tokens.push({ type: "strong", value: match[6] ?? match[7] ?? "" });
    } else if (match[8] !== undefined || match[9] !== undefined) {
      tokens.push({ type: "emphasis", value: match[8] ?? match[9] ?? "" });
    } else if (match[10] !== undefined) {
      tokens.push({ type: "code", value: match[10] });
    } else if (match[12] !== undefined) {
      tokens.push({ type: "formula", value: match[12] });
    }
    lastIndex = index + match[0].length;
  }
  if (lastIndex < value.length) tokens.push({ type: "text", value: value.slice(lastIndex) });
  return tokens.length ? tokens : [{ type: "text", value: "" }];
}

export function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let code: string[] | null = null;
  let formula: string[] | null = null;
  let listItems: string[] = [];
  let listOrdered = false;

  function flushParagraph() {
    const value = paragraph.join(" ").trim();
    if (value) blocks.push({ type: "paragraph", tokens: parseMarkdownInline(value) });
    paragraph = [];
  }
  function flushList() {
    if (listItems.length) {
      blocks.push({
        type: "list",
        ordered: listOrdered,
        items: listItems.map((item) => parseMarkdownInline(item)),
      });
      listItems = [];
    }
  }

  for (const line of lines) {
    if (code) {
      if (line.trim().startsWith("```")) {
        blocks.push({ type: "code", value: code.join("\n") });
        code = null;
      } else code.push(line);
      continue;
    }
    if (formula) {
      if (line.trim() === "$$") {
        blocks.push({ type: "formula", value: formula.join("\n") });
        formula = null;
      } else formula.push(line);
      continue;
    }
    if (line.trim().startsWith("```")) {
      flushParagraph();
      flushList();
      code = [];
      continue;
    }
    if (line.trim() === "$$") {
      flushParagraph();
      flushList();
      formula = [];
      continue;
    }
    const heading = /^(#{1,4})\s+(.+)$/.exec(line.trim());
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        type: "heading",
        level: heading[1].length,
        tokens: parseMarkdownInline(heading[2]),
      });
      continue;
    }
    const list = /^(\*|-|\+)\s+(.+)$/.exec(line.trim());
    const ordered = /^(\d+)\.\s+(.+)$/.exec(line.trim());
    if (list || ordered) {
      flushParagraph();
      const isOrdered = Boolean(ordered);
      if (listItems.length && listOrdered !== isOrdered) flushList();
      listOrdered = isOrdered;
      listItems.push((list ?? ordered)![2]);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    flushList();
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  if (code) blocks.push({ type: "code", value: code.join("\n") });
  if (formula) blocks.push({ type: "formula", value: formula.join("\n") });
  return blocks;
}
