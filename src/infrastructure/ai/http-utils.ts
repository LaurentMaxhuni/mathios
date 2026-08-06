import { ApplicationError } from "@/domain/errors/application-error";

export class AiProviderUnavailableError extends ApplicationError {
  constructor(message = "The configured AI provider is unavailable.") {
    super("CONFLICT", message, 503);
    this.name = "AiProviderUnavailableError";
  }
}

export type AiFetch = typeof fetch;

export function providerEndpoint(baseUrl: string, path: string): string {
  return new URL(path.replace(/^\//, ""), `${baseUrl.replace(/\/$/, "")}/`).toString();
}

export async function fetchWithTimeout(
  fetchImpl: AiFetch,
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(input, { ...init, signal: controller.signal });
  } catch {
    throw new AiProviderUnavailableError("The configured AI provider could not be reached.");
  } finally {
    clearTimeout(timer);
  }
}

export async function parseProviderContent(response: Response): Promise<string> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AiProviderUnavailableError("The AI provider returned an invalid response.");
  }
  if (!response.ok) {
    throw new AiProviderUnavailableError("The AI provider rejected the request.");
  }
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const choices = Array.isArray(record.choices) ? record.choices : [];
  const firstChoice =
    choices[0] && typeof choices[0] === "object" ? (choices[0] as Record<string, unknown>) : null;
  const message =
    firstChoice?.message && typeof firstChoice.message === "object"
      ? (firstChoice.message as Record<string, unknown>)
      : null;
  const messageContent = message?.content;
  const nativeMessage =
    record.message && typeof record.message === "object"
      ? (record.message as Record<string, unknown>)
      : null;
  const nativeContent = nativeMessage?.content;
  const content = extractText(messageContent ?? nativeContent ?? record.response);
  if (!content) throw new AiProviderUnavailableError("The AI provider returned no usable content.");
  return content;
}

function extractText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!Array.isArray(value)) return "";
  return value
    .map((part) => {
      if (typeof part === "string") return part;
      if (!part || typeof part !== "object") return "";
      const record = part as Record<string, unknown>;
      return typeof record.text === "string" ? record.text : "";
    })
    .join("")
    .trim();
}

export function healthMessage(available: boolean, providerName: string): string {
  return available ? `${providerName} is reachable.` : `${providerName} is unavailable.`;
}
