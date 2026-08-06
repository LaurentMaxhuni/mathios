import { describe, expect, it } from "vitest";
import {
  PHASE20_REQUIRED_TOPIC_SLUGS,
  validatePhase20Topics,
} from "@/domain/scientific-content/phase20";
import { phase20TopicSeed } from "@/infrastructure/database/phase20-content";

describe("Phase 20 scientific content contract", () => {
  it("covers every planned topic with safe formulas and progression metadata", () => {
    expect(validatePhase20Topics(phase20TopicSeed)).toEqual([]);

    for (const [subject, requiredSlugs] of Object.entries(PHASE20_REQUIRED_TOPIC_SLUGS)) {
      const actual = new Set(
        phase20TopicSeed
          .filter((topic) => topic.subjectSlug === subject)
          .map((topic) => topic.slug),
      );
      for (const slug of requiredSlugs) expect(actual.has(slug)).toBe(true);
    }
  });

  it("reports prerequisite cycles and unsafe formula markup", () => {
    const topics = phase20TopicSeed.slice(0, 2).map((topic, index) => ({
      ...topic,
      key: `test:${index}`,
      slug: `test-${index}`,
      domainId: `domain-test-${index}`,
      prerequisiteKeys: [`test:${index === 0 ? 1 : 0}`],
      formula: index === 0 ? "<script>" : topic.formula,
    }));
    const errors = validatePhase20Topics(topics);
    expect(errors.some((error) => error.includes("Prerequisite cycle detected"))).toBe(true);
    expect(errors.some((error) => error.includes("formula contains markup characters"))).toBe(true);
  });
});
