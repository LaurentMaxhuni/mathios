import { randomUUID } from "node:crypto";
import { NotFoundError, ValidationError } from "@/domain/errors/application-error";
import {
  buildGroundedPrompt,
  DEFAULT_AI_SETTINGS,
  normalizeAiSettings,
  normalizeGenerationInput,
  sanitizeAiOutput,
  sanitizeGroundingSources,
} from "@/domain/ai/rules";
import type {
  AiDashboardData,
  AiGenerationInput,
  AiGenerationRecord,
  AiGroundingSource,
  AiProviderHealth,
  AiSettingsInput,
  AiSettingsView,
} from "@/domain/ai/types";
import type { AiRepository } from "@/domain/ports/ai-repository";
import { getAiRepository } from "@/infrastructure/database/repositories/ai-repository";
import { getConceptRepository } from "@/infrastructure/database/repositories/concept-repository";
import { getCourseRepository } from "@/infrastructure/database/repositories/course-repository";
import { getMasteryRepository } from "@/infrastructure/database/repositories/mastery-repository";
import { createAiProvider } from "@/infrastructure/ai/provider-factory";
import { encryptAiSecret } from "@/infrastructure/ai/secret-vault";
import { env } from "@/lib/env";

export async function getAiSettingsView(
  repository: AiRepository = getAiRepository(),
): Promise<AiSettingsView> {
  const settings = await repository.getSettings();
  const { remoteApiKeyCiphertext, ...view } = settings;
  return {
    ...view,
    hasRemoteApiKey: Boolean(remoteApiKeyCiphertext || env.AI_REMOTE_API_KEY),
  };
}

export async function getAiDashboard(
  profileId: string,
  repository: AiRepository = getAiRepository(),
): Promise<AiDashboardData> {
  const [settings, generations] = await Promise.all([
    getAiSettingsView(repository),
    repository.listGenerations(profileId),
  ]);
  return { settings, generations };
}

export async function updateAiSettings(
  input: AiSettingsInput,
  repository: AiRepository = getAiRepository(),
): Promise<AiSettingsView> {
  const current = await repository.getSettings();
  const normalized = normalizeAiSettings(input);
  const remoteApiKeyCiphertext =
    normalized.remoteApiKey === undefined
      ? current.remoteApiKeyCiphertext
      : normalized.remoteApiKey
        ? encryptAiSecret(normalized.remoteApiKey)
        : null;
  const { remoteApiKey: ignoredRemoteApiKey, ...settingsForRepository } = normalized;
  void ignoredRemoteApiKey;
  await repository.updateSettings({
    ...settingsForRepository,
    remoteApiKeyCiphertext,
  });
  return getAiSettingsView(repository);
}

export async function checkAiHealth(
  repository: AiRepository = getAiRepository(),
): Promise<AiProviderHealth> {
  const settings = await repository.getSettings();
  if (settings.mode === "disabled") {
    return {
      provider: "disabled",
      model: "disabled",
      available: false,
      message: "AI is disabled in this installation.",
      checkedAt: new Date().toISOString(),
    };
  }
  return createAiProvider(settings).checkHealth();
}

export async function generateAiContent(
  profileId: string,
  input: AiGenerationInput,
  dependencies: {
    repository?: AiRepository;
    provider?: ReturnType<typeof createAiProvider>;
  } = {},
): Promise<AiGenerationRecord> {
  const normalizedInput = normalizeGenerationInput(input);
  const repository = dependencies.repository ?? getAiRepository();
  const settings = await repository.getSettings();
  if (settings.mode === "disabled") {
    throw new ValidationError(
      "AI is disabled in this installation. Enable a provider to generate content.",
    );
  }
  const grounding = await buildGrounding(profileId, normalizedInput);
  const prompts = buildGroundedPrompt(normalizedInput.task, normalizedInput.instruction, grounding);
  const provider = dependencies.provider ?? createAiProvider(settings);
  const response = await provider.generate({
    task: normalizedInput.task,
    systemPrompt: prompts.systemPrompt,
    userPrompt: prompts.userPrompt,
    grounding,
    maxTokens: settings.maxTokens,
    temperature: settings.temperature,
  });
  const output = sanitizeAiOutput(response.content);
  if (!output) throw new ValidationError("The AI provider returned an empty response.");
  return repository.createGeneration({
    id: randomUUID(),
    profileId,
    task: normalizedInput.task,
    mode: settings.mode,
    provider: response.provider,
    model: response.model,
    instruction: normalizedInput.instruction,
    grounding,
    output,
    status: "generated",
  });
}

export async function reviewAiGeneration(
  generationId: string,
  status: Extract<AiGenerationRecord["status"], "approved" | "rejected">,
  reviewedByProfileId: string,
  repository: AiRepository = getAiRepository(),
): Promise<AiGenerationRecord> {
  return repository.reviewGeneration(generationId, status, reviewedByProfileId);
}

async function buildGrounding(
  profileId: string,
  input: AiGenerationInput,
): Promise<readonly AiGroundingSource[]> {
  const sources: AiGroundingSource[] = [];
  if (input.lessonId) {
    const reader = await getCourseRepository().getLessonReader(input.lessonId, profileId);
    if (reader) {
      const content = [
        "Lesson title: " + reader.lesson.title,
        "Lesson summary: " + reader.lesson.summary,
        ...reader.version.snapshot.sections.flatMap((entry) => [
          "Section: " + entry.section.title,
          entry.section.description,
          ...entry.blocks.map(
            (block) => (block.title ?? block.type) + ": " + JSON.stringify(block.payload),
          ),
        ]),
      ].join("\n");
      sources.push({
        type: reader.lesson.createdByProfileId ? "creator" : "official",
        label: "Published lesson: " + reader.lesson.title,
        content,
        resourceId: reader.lesson.id,
        approved: true,
      });
    }
  }
  if (input.conceptId) {
    const detail = await getConceptRepository().getConceptDetail(input.conceptId);
    if (detail) {
      sources.push({
        type: "official",
        label: "Concept: " + detail.concept.name,
        content: [
          detail.concept.description,
          "Subject: " + detail.subjectName,
          detail.domainName ? "Domain: " + detail.domainName : "",
          "Applications: " + detail.applications.map((item) => item.description).join(" | "),
          "Misconceptions: " +
            detail.misconceptions
              .map((item) => item.misconception + " -> " + item.correction)
              .join(" | "),
          "Related published lessons: " + detail.lessons.map((item) => item.lessonTitle).join(", "),
        ]
          .filter(Boolean)
          .join("\n"),
        resourceId: detail.concept.id,
        approved: true,
      });
    }
    const mastery = await getMasteryRepository().getMastery(profileId, input.conceptId);
    if (mastery) {
      sources.push({
        type: "mastery",
        label: "Learner mastery context",
        content:
          "State: " +
          mastery.state +
          "; score: " +
          mastery.score.toFixed(2) +
          "; confidence: " +
          mastery.confidence.toFixed(2) +
          "; evidence: " +
          mastery.evidenceCount +
          ".",
        resourceId: input.conceptId,
        approved: true,
      });
    }
  }
  if (input.gradeId) {
    sources.push({
      type: "official",
      label: "Selected grade",
      content:
        "The learner selected grade or level identifier: " +
        input.gradeId +
        ". Keep examples appropriate for this level and do not infer an exact curriculum standard from the identifier alone.",
      resourceId: input.gradeId,
      approved: true,
    });
  }
  if (input.learnerContext) {
    sources.push({
      type: "learner",
      label: "Learner-provided context",
      content: input.learnerContext,
      approved: false,
    });
  }
  if (!sources.length) {
    sources.push({
      type: "learner",
      label: "Learner request",
      content: input.instruction,
      approved: false,
    });
  }
  const sanitized = sanitizeGroundingSources(sources);
  if (!sanitized.length) throw new NotFoundError("Approved AI grounding context");
  return sanitized;
}

export function defaultAiSettings(): Omit<AiSettingsInput, "remoteApiKey"> {
  return { ...DEFAULT_AI_SETTINGS };
}
