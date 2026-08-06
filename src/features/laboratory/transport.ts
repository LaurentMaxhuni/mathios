import type { z } from "zod";
import type { LaboratoryActivityInput } from "@/domain/laboratory/types";
import { laboratoryActivitySchema } from "@/features/laboratory/schemas";

type ParsedActivity = z.infer<typeof laboratoryActivitySchema>;

export function toLaboratoryActivityInput(
  input: ParsedActivity,
  activityId?: string,
): LaboratoryActivityInput {
  const stableId = activityId ?? input.id ?? `laboratory-activity-${input.slug}`;
  return {
    ...input,
    id: stableId,
    steps: input.steps.map((step, index) => ({
      ...step,
      id: `${stableId}-step-${index + 1}`,
    })),
    variables: input.variables.map((variable, index) => ({
      ...variable,
      id: `${stableId}-variable-${variable.key || index + 1}`,
    })),
  };
}
