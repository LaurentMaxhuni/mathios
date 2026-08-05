import type {
  ConceptListEntry,
  ConceptRelationship,
  KnowledgeGraph,
  KnowledgeGraphEdge,
  KnowledgeGraphNode,
} from "@/domain/concept/types";

export function layoutKnowledgeGraph(
  concepts: readonly ConceptListEntry[],
  relationships: readonly ConceptRelationship[],
  integrity: Pick<KnowledgeGraph, "orphanedConceptIds" | "requiredCycle"> = {
    orphanedConceptIds: [],
    requiredCycle: null,
  },
): KnowledgeGraph {
  const conceptById = new Map(concepts.map((concept) => [concept.id, concept]));
  const prerequisiteTargets = new Map<string, string[]>();
  for (const relationship of relationships) {
    if (relationship.type !== "requires") continue;
    const targets = prerequisiteTargets.get(relationship.sourceConceptId) ?? [];
    targets.push(relationship.targetConceptId);
    prerequisiteTargets.set(relationship.sourceConceptId, targets);
  }

  const rankMemo = new Map<string, number>();
  const rankStack = new Set<string>();
  function rank(id: string): number {
    const cached = rankMemo.get(id);
    if (cached !== undefined) return cached;
    if (rankStack.has(id)) return 0;
    rankStack.add(id);
    const value = Math.max(
      0,
      ...(prerequisiteTargets.get(id) ?? []).map((target) => rank(target) + 1),
    );
    rankStack.delete(id);
    rankMemo.set(id, value);
    return value;
  }

  const groups = new Map<number, ConceptListEntry[]>();
  for (const concept of concepts) {
    const group = groups.get(rank(concept.id)) ?? [];
    group.push(concept);
    groups.set(rank(concept.id), group);
  }

  const positions = new Map<string, { x: number; y: number }>();
  for (const [column, group] of [...groups.entries()].sort(([left], [right]) => left - right)) {
    group.sort((left, right) => left.name.localeCompare(right.name));
    group.forEach((concept, row) => {
      positions.set(concept.id, { x: 120 + column * 285, y: 100 + row * 145 });
    });
  }

  const nodes: KnowledgeGraphNode[] = concepts.map((concept) => ({
    ...concept,
    ...(positions.get(concept.id) ?? { x: 120, y: 100 }),
    locked: (prerequisiteTargets.get(concept.id) ?? []).some((id) => conceptById.has(id)),
  }));
  const edges: KnowledgeGraphEdge[] = relationships
    .filter(
      (relationship) =>
        conceptById.has(relationship.sourceConceptId) &&
        conceptById.has(relationship.targetConceptId),
    )
    .map((relationship) => ({
      ...relationship,
      sourceName: conceptById.get(relationship.sourceConceptId)!.name,
      targetName: conceptById.get(relationship.targetConceptId)!.name,
    }));
  return { nodes, edges, ...integrity };
}
