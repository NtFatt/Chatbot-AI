import { GoogleGenAI } from '@google/genai';

import type { AIProvider, AIProviderRequest, AIProviderResponse } from '../ai.types';

export class GeminiAdapter implements AIProvider {
  readonly key = 'GEMINI' as const;
  private readonly client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generate(
    request: AIProviderRequest,
    callbacks?: {
      onChunk?: (chunk: string) => void;
    },
  ): Promise<AIProviderResponse> {
    const startedAt = Date.now();
    const stream = await Promise.race([
      this.client.models.generateContentStream({
        model: request.model,
        contents: request.messages
          .map((message) => `${message.role.toUpperCase()}:\n${message.content}`)
          .join('\n\n'),
        config: {
          systemInstruction: request.systemPrompt,
          temperature: 0.35,
        },
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), request.timeoutMs);
      }),
    ]);

    let text = '';

    for await (const chunk of stream) {
      const nextChunk = chunk.text ?? '';
      if (!nextChunk) {
        continue;
      }

      text += nextChunk;
      callbacks?.onChunk?.(nextChunk);
    }

    return {
      text,
      finishReason: text ? 'stop' : 'unknown',
      latencyMs: Date.now() - startedAt,
    };
  }
}
