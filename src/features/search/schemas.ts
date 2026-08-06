import { z } from "zod";
import {
  SEARCH_DIFFICULTIES,
  SEARCH_DOCUMENT_TYPES,
  SEARCH_MASTERY_STATES,
  SEARCH_PUBLICATION_STATUSES,
} from "@/domain/search/types";

export const searchQuerySchema = z.object({
  q: z.string().trim().max(200).default(""),
  types: z.array(z.enum(SEARCH_DOCUMENT_TYPES)).max(15).default([]),
  subjectIds: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  gradeIds: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  curriculumIds: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  difficulties: z.array(z.enum(SEARCH_DIFFICULTIES)).max(4).default([]),
  masteryStates: z.array(z.enum(SEARCH_MASTERY_STATES)).max(8).default([]),
  publicationStatuses: z.array(z.enum(SEARCH_PUBLICATION_STATUSES)).max(4).default([]),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const searchHistorySchema = z.object({
  query: z.string().trim().min(1).max(200),
  filters: z
    .object({
      types: z.array(z.string()).optional(),
      subjectIds: z.array(z.string()).optional(),
      gradeIds: z.array(z.string()).optional(),
      curriculumIds: z.array(z.string()).optional(),
      difficulties: z.array(z.string()).optional(),
      masteryStates: z.array(z.string()).optional(),
      publicationStatuses: z.array(z.string()).optional(),
    })
    .optional(),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;

export function parseSearchParams(params: URLSearchParams): SearchQueryInput {
  const split = (value: string | null) => (value ? value.split(",").filter(Boolean) : []);
  return searchQuerySchema.parse({
    q: params.get("q") ?? "",
    types: split(params.get("types") ?? params.get("type")),
    subjectIds: split(params.get("subjectIds") ?? params.get("subjectId")),
    gradeIds: split(params.get("gradeIds") ?? params.get("gradeId")),
    curriculumIds: split(params.get("curriculumIds") ?? params.get("curriculumId")),
    difficulties: split(params.get("difficulties") ?? params.get("difficulty")),
    masteryStates: split(params.get("masteryStates") ?? params.get("mastery")),
    publicationStatuses: split(
      params.get("publicationStatuses") ?? params.get("publicationStatus"),
    ),
    limit: params.get("limit") ?? 20,
  });
}

export function toSearchQuery(input: SearchQueryInput) {
  return {
    text: input.q,
    types: input.types,
    subjectIds: input.subjectIds,
    gradeIds: input.gradeIds,
    curriculumIds: input.curriculumIds,
    difficulties: input.difficulties,
    masteryStates: input.masteryStates,
    publicationStatuses: input.publicationStatuses,
    limit: input.limit,
  } as const;
}
