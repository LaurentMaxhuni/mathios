import { ValidationError } from "@/domain/errors/application-error";
import type {
  ConceptIntegrityReport,
  ConceptRecord,
  ConceptRelationship,
  ConceptRelationshipType,
  ConceptIntegritySnapshot,
} from "@/domain/concept/types";
import { CONCEPT_RELATIONSHIP_TYPES } from "@/domain/concept/types";

const relationshipTypes = new Set<string>(CONCEPT_RELATIONSHIP_TYPES);

export function isConceptRelationshipType(value: string): value is ConceptRelationshipType {
  return relationshipTypes.has(value);
}

export function isRequiredPrerequisite(type: ConceptRelationshipType): boolean {
  return type === "requires";
}

export function assertValidConceptRelationship(input: {
  sourceConceptId: string;
  targetConceptId: string;
  type: string;
}): asserts input is {
  sourceConceptId: string;
  targetConceptId: string;
  type: ConceptRelationshipType;
} {
  if (input.sourceConceptId === input.targetConceptId) {
    throw new ValidationError("A concept cannot relate to itself.");
  }
  if (!isConceptRelationshipType(input.type)) {
    throw new ValidationError("Choose a supported concept relationship type.");
  }
}

export function relationshipKey(
  relationship: Pick<ConceptRelationship, "sourceConceptId" | "targetConceptId" | "type">,
): string {
  return `${relationship.sourceConceptId}:${relationship.type}:${relationship.targetConceptId}`;
}

export function findRequiredPrerequisiteCycle(
  relationships: readonly Pick<
    ConceptRelationship,
    "sourceConceptId" | "targetConceptId" | "type"
  >[],
): readonly string[] | null {
  const adjacency = new Map<string, string[]>();
  for (const relationship of relationships) {
    if (!isRequiredPrerequisite(relationship.type)) continue;
    const targets = adjacency.get(relationship.sourceConceptId) ?? [];
    targets.push(relationship.targetConceptId);
    adjacency.set(relationship.sourceConceptId, targets);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function visit(node: string): readonly string[] | null {
    if (visiting.has(node)) {
      const start = stack.indexOf(node);
      return [...stack.slice(start), node];
    }
    if (visited.has(node)) return null;
    visiting.add(node);
    stack.push(node);
    for (const target of adjacency.get(node) ?? []) {
      const cycle = visit(target);
      if (cycle) return cycle;
    }
    stack.pop();
    visiting.delete(node);
    visited.add(node);
    return null;
  }

  for (const node of new Set([...adjacency.keys(), ...[...adjacency.values()].flat()])) {
    const cycle = visit(node);
    if (cycle) return cycle;
  }
  return null;
}

export function traverseConcepts(
  startConceptId: string,
  relationships: readonly Pick<
    ConceptRelationship,
    "sourceConceptId" | "targetConceptId" | "type"
  >[],
  direction: "prerequisites" | "descendants",
  relationshipTypes: readonly ConceptRelationshipType[] = ["requires"],
): readonly string[] {
  const allowed = new Set(relationshipTypes);
  const adjacency = new Map<string, string[]>();
  for (const relationship of relationships) {
    if (!allowed.has(relationship.type)) continue;
    const source =
      direction === "prerequisites" ? relationship.sourceConceptId : relationship.targetConceptId;
    const target =
      direction === "prerequisites" ? relationship.targetConceptId : relationship.sourceConceptId;
    const values = adjacency.get(source) ?? [];
    values.push(target);
    adjacency.set(source, values);
  }

  const result: string[] = [];
  const visited = new Set<string>([startConceptId]);
  const queue = [...(adjacency.get(startConceptId) ?? [])];
  while (queue.length) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    result.push(current);
    queue.push(...(adjacency.get(current) ?? []));
  }
  return result;
}

export function findOrphanedConceptIds(snapshot: ConceptIntegritySnapshot): readonly string[] {
  const connected = new Set<string>();
  for (const relationship of snapshot.relationships) {
    connected.add(relationship.sourceConceptId);
    connected.add(relationship.targetConceptId);
  }
  for (const link of snapshot.lessonLinks) connected.add(link.conceptId);
  for (const link of snapshot.objectiveLinks) connected.add(link.conceptId);
  return snapshot.concepts.map((concept) => concept.id).filter((id) => !connected.has(id));
}

export function buildConceptIntegrityReport(
  snapshot: ConceptIntegritySnapshot,
): ConceptIntegrityReport {
  const conceptIds = new Set(snapshot.concepts.map((concept) => concept.id));
  const missingConceptIds = new Set<string>();
  const keys = new Set<string>();
  const duplicateRelationshipKeys = new Set<string>();
  for (const relationship of snapshot.relationships) {
    if (!conceptIds.has(relationship.sourceConceptId))
      missingConceptIds.add(relationship.sourceConceptId);
    if (!conceptIds.has(relationship.targetConceptId))
      missingConceptIds.add(relationship.targetConceptId);
    const key = relationshipKey(relationship);
    if (keys.has(key)) duplicateRelationshipKeys.add(key);
    keys.add(key);
  }
  return {
    orphanedConceptIds: findOrphanedConceptIds(snapshot),
    missingConceptIds: [...missingConceptIds],
    duplicateRelationshipKeys: [...duplicateRelationshipKeys],
    requiredCycle: findRequiredPrerequisiteCycle(snapshot.relationships),
  };
}

export function assertNoRequiredPrerequisiteCycle(
  relationships: readonly Pick<
    ConceptRelationship,
    "sourceConceptId" | "targetConceptId" | "type"
  >[],
): void {
  const cycle = findRequiredPrerequisiteCycle(relationships);
  if (cycle) {
    throw new ValidationError(
      `Required prerequisite relationships cannot form a cycle: ${cycle.join(" → ")}.`,
      [{ path: "relationship", message: "Remove one of the required prerequisite edges." }],
    );
  }
}

export function assertConceptRange(
  concept: Pick<ConceptRecord, "gradeMinId" | "gradeMaxId">,
  gradeOrder: readonly { id: string; sortOrder: number }[],
): void {
  if (!concept.gradeMinId || !concept.gradeMaxId) return;
  const minimum = gradeOrder.find((grade) => grade.id === concept.gradeMinId)?.sortOrder;
  const maximum = gradeOrder.find((grade) => grade.id === concept.gradeMaxId)?.sortOrder;
  if (minimum === undefined || maximum === undefined) return;
  if (minimum > maximum) {
    throw new ValidationError("The first grade must not come after the last grade.", [
      { path: "gradeMinId", message: "Choose a grade at or before the last grade." },
    ]);
  }
}
