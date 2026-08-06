import type { AiProvider, AiSettingsRecord } from "@/domain/ai/types";
import { DisabledAiProvider } from "@/infrastructure/ai/disabled-ai-provider";
import { HybridAiProvider } from "@/infrastructure/ai/hybrid-ai-provider";
import { LocalAiProvider } from "@/infrastructure/ai/local-ai-provider";
import { RemoteAiProvider } from "@/infrastructure/ai/remote-ai-provider";
import { decryptAiSecret } from "@/infrastructure/ai/secret-vault";
import { env } from "@/lib/env";
import type { AiFetch } from "@/infrastructure/ai/http-utils";

export function createAiProvider(
  settings: AiSettingsRecord,
  options: { fetchImpl?: AiFetch; remoteApiKey?: string | null } = {},
): AiProvider {
  if (settings.mode === "disabled") return new DisabledAiProvider();

  const local = new LocalAiProvider({
    baseUrl: settings.localBaseUrl || env.AI_LOCAL_BASE_URL,
    model: settings.localModel || env.AI_LOCAL_MODEL,
    maxTokens: settings.maxTokens,
    temperature: settings.temperature,
    timeoutMs: env.AI_REQUEST_TIMEOUT_MS,
    fetchImpl: options.fetchImpl,
  });
  const remote = new RemoteAiProvider({
    baseUrl: settings.remoteBaseUrl || env.AI_REMOTE_BASE_URL,
    model: settings.remoteModel || env.AI_REMOTE_MODEL,
    apiKey:
      options.remoteApiKey ??
      decryptAiSecret(settings.remoteApiKeyCiphertext) ??
      env.AI_REMOTE_API_KEY ??
      null,
    maxTokens: settings.maxTokens,
    temperature: settings.temperature,
    timeoutMs: env.AI_REQUEST_TIMEOUT_MS,
    fetchImpl: options.fetchImpl,
  });

  if (settings.mode === "local") return local;
  if (settings.mode === "remote") return remote;
  return new HybridAiProvider(local, remote);
}
