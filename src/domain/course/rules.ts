import { ConflictError, ValidationError } from "@/domain/errors/application-error";
import {
  CONTENT_STATUSES,
  LESSON_BLOCK_TYPES,
  type ContentStatus,
  type LessonBlockPayload,
  type LessonBlockType,
  type LessonSectionRecord,
  type LessonBlockRecord,
} from "@/domain/course/types";

export function isLessonBlockType(value: string): value is LessonBlockType {
  return (LESSON_BLOCK_TYPES as readonly string[]).includes(value);
}

export function normalizeFormula(formula: string): string {
  return formula.trim().replace(/\r\n/g, "\n");
}

export function validateFormula(formula: string): void {
  const normalized = normalizeFormula(formula);
  if (!normalized) throw new ValidationError("A formula cannot be empty.");
  if (normalized.length > 4000) throw new ValidationError("Keep formulas under 4,000 characters.");
  if (/<\/?(script|style|iframe)\b/i.test(normalized)) {
    throw new ValidationError("Formula content cannot contain executable markup.");
  }

  let braces = 0;
  let brackets = 0;
  let parentheses = 0;
  for (const character of normalized) {
    if (character === "{") braces += 1;
    if (character === "}") braces -= 1;
    if (character === "[") brackets += 1;
    if (character === "]") brackets -= 1;
    if (character === "(") parentheses += 1;
    if (character === ")") parentheses -= 1;
    if (braces < 0 || brackets < 0 || parentheses < 0) {
      throw new ValidationError("Formula delimiters must be balanced.");
    }
  }
  if (braces !== 0 || brackets !== 0 || parentheses !== 0) {
    throw new ValidationError("Formula delimiters must be balanced.");
  }
}

export function validateBlockPayload(type: LessonBlockType, payload: LessonBlockPayload): void {
  if (type === "formula") {
    const formula = typeof payload.latex === "string" ? payload.latex : "";
    validateFormula(formula);
    const label = typeof payload.accessibleLabel === "string" ? payload.accessibleLabel.trim() : "";
    if (!label) throw new ValidationError("Formula blocks need an accessible label.");
  }
  if (["image", "diagram"].includes(type)) {
    const altText = typeof payload.altText === "string" ? payload.altText.trim() : "";
    if (!altText) throw new ValidationError(`${type} blocks need alternative text.`);
  }
}

export function validateLessonForPublishing(
  sections: readonly { section: LessonSectionRecord; blocks: readonly LessonBlockRecord[] }[],
): void {
  if (!sections.length) throw new ValidationError("Add at least one section before publishing.");
  const blocks = sections.flatMap((entry) => entry.blocks);
  if (!blocks.length)
    throw new ValidationError("Add at least one content block before publishing.");
  for (const block of blocks) {
    if (!isLessonBlockType(block.type))
      throw new ValidationError("The lesson contains an unknown block type.");
    validateBlockPayload(block.type, block.payload);
  }
}

export function assertStatusTransition(from: ContentStatus, to: ContentStatus): void {
  if (!(CONTENT_STATUSES as readonly string[]).includes(to)) {
    throw new ValidationError("Use a supported content status.");
  }
  if (from === to) return;
  if (from === "archived" && to === "published") {
    throw new ConflictError("Restore an archived lesson to draft before publishing it.");
  }
}

export function calculateCompletionPercentage(totalBlocks: number, viewedBlocks: number): number {
  if (totalBlocks <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((viewedBlocks / totalBlocks) * 100)));
}

export function nextVersionNumber(existing: readonly number[]): number {
  return Math.max(0, ...existing) + 1;
}
