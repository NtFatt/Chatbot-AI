import OpenAI from 'openai';

import type { AIProvider, AIProviderRequest, AIProviderResponse } from '../ai.types';

export class OpenAIAdapter implements AIProvider {
  readonly key = 'OPENAI' as const;
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generate(
    request: AIProviderRequest,
    callbacks?: {
      onChunk?: (chunk: string) => void;
    },
  ): Promise<AIProviderResponse> {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs);

    try {
      const response = await this.client.responses.create(
        {
          model: request.model,
          input: [
            {
              role: 'system',
              content: [{ type: 'input_text', text: request.systemPrompt }],
            },
            ...request.messages.map((message) => ({
              role: message.role,
              content: [{ type: 'input_text', text: message.content }],
            })),
          ],
        } as never,
        {
          signal: controller.signal,
        },
      );

      const text = response.output_text ?? '';
      if (text) {
        callbacks?.onChunk?.(text);
      }

      return {
        text,
        finishReason: response.status === 'completed' ? 'stop' : 'unknown',
        latencyMs: Date.now() - startedAt,
        usage: response.usage
          ? {
              inputTokens: response.usage.input_tokens,
              outputTokens: response.usage.output_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
