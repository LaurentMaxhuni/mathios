import { z } from "zod";
import {
  BOOKMARK_RESOURCE_TYPES,
  HIGHLIGHT_COLORS,
  HIGHLIGHT_SOURCE_TYPES,
  NOTE_RESOURCE_TYPES,
} from "@/domain/notes/types";

const idSchema = z.string().trim().min(1).max(200);

export const noteInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  bodyMarkdown: z.string().max(100_000),
  folderId: idSchema.nullable().default(null),
  isPinned: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  tagNames: z.array(z.string().trim().min(1).max(48)).max(20).default([]),
});

export const noteUpdateSchema = noteInputSchema.partial();

export const folderInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  parentFolderId: idSchema.nullable().default(null),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
});

export const folderUpdateSchema = folderInputSchema.partial();

export const noteResourceLinkSchema = z.object({
  kind: z.literal("resource"),
  resourceType: z.enum(NOTE_RESOURCE_TYPES),
  resourceId: idSchema,
  label: z.string().trim().max(200).default(""),
  sourceLocation: z.string().trim().max(500).default(""),
});

export const noteInternalLinkSchema = z.object({
  kind: z.literal("note"),
  targetNoteId: idSchema,
  anchor: z.string().trim().max(200).default(""),
});

export const noteLinkSchema = z.discriminatedUnion("kind", [
  noteResourceLinkSchema,
  noteInternalLinkSchema,
]);

export const highlightSchema = z.object({
  sourceType: z.enum(HIGHLIGHT_SOURCE_TYPES),
  sourceId: idSchema,
  sourceLocation: z.string().trim().max(500).default(""),
  selectedText: z.string().trim().min(1).max(4_000),
  noteId: idSchema.nullable().default(null),
  color: z.enum(HIGHLIGHT_COLORS).default("yellow"),
});

export const bookmarkSchema = z.object({
  resourceType: z.enum(BOOKMARK_RESOURCE_TYPES),
  resourceId: idSchema,
  title: z.string().trim().max(240).default(""),
  sourceUrl: z.string().trim().max(1_000).default(""),
});

export const notesQuerySchema = z.object({
  query: z.string().trim().max(200).optional(),
  folderId: idSchema.optional(),
  tagId: idSchema.optional(),
  includeArchived: z.coerce.boolean().default(false),
});
