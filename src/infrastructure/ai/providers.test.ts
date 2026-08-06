import { describe, expect, it, vi } from "vitest";
import type { AiRequest } from "@/domain/ai/types";
import { HybridAiProvider } from "@/infrastructure/ai/hybrid-ai-provider";
import { LocalAiProvider } from "@/infrastructure/ai/local-ai-provider";
import { RemoteAiProvider } from "@/infrastructure/ai/remote-ai-provider";

const request: AiRequest = {
  task: "simpler-explanation",
  systemPrompt: "System grounding rules.",
  userPrompt: "Explain acceleration.",
  grounding: [],
  maxTokens: 256,
  temperature: 0.2,
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("AI provider adapters", () => {
  it("sends grounded requests to a local Ollama-compatible endpoint", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response({ message: { content: "A local explanation." } }));
    const provider = new LocalAiProvider({
      baseUrl: "http://127.0.0.1:11434",
      model: "llama3.2",
      maxTokens: 256,
      temperature: 0.2,
      fetchImpl,
    });

    await expect(provider.generate(request)).resolves.toMatchObject({
      content: "A local explanation.",
      provider: "local",
      model: "llama3.2",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/api/chat",
      expect.objectContaining({ method: "POST" }),
    );
    const init = fetchImpl.mock.calls[0]?.[1];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: "llama3.2",
      stream: false,
      messages: [
        { role: "system", content: "System grounding rules." },
        { role: "user", content: "Explain acceleration." },
      ],
    });
  });

  it("keeps remote keys in the authorization header and parses OpenAI-compatible output", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        response({ choices: [{ message: { content: "A remote explanation." } }] }),
      );
    const provider = new RemoteAiProvider({
      baseUrl: "https://api.example.test/v1",
      model: "remote-model",
      apiKey: "secret-api-key",
      maxTokens: 256,
      temperature: 0.2,
      fetchImpl,
    });

    await expect(provider.generate(request)).resolves.toMatchObject({
      content: "A remote explanation.",
      provider: "remote",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.test/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer secret-api-key" }),
      }),
    );
    const body = String(fetchImpl.mock.calls[0]?.[1]?.body);
    expect(body).not.toContain("secret-api-key");
  });

  it("falls back from an unavailable local provider in hybrid mode", async () => {
    const local = new LocalAiProvider({
      baseUrl: "http://127.0.0.1:11434",
      model: "local",
      maxTokens: 256,
      temperature: 0.2,
      fetchImpl: vi.fn<typeof fetch>().mockRejectedValue(new Error("offline")),
    });
    const remote = new RemoteAiProvider({
      baseUrl: "https://api.example.test/v1",
      model: "remote",
      apiKey: "key",
      maxTokens: 256,
      temperature: 0.2,
      fetchImpl: vi
        .fn<typeof fetch>()
        .mockResolvedValue(response({ choices: [{ message: { content: "Remote fallback." } }] })),
    });
    const provider = new HybridAiProvider(local, remote);

    await expect(provider.generate(request)).resolves.toMatchObject({
      content: "Remote fallback.",
      provider: "remote",
    });
  });
});
