import OpenAI from 'openai';
import type {
  Response,
  ResponseCreateParamsNonStreaming,
  ResponseCreateParamsStreaming,
  ResponseStreamEvent,
} from 'openai/resources/responses/responses';

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
      if (request.structuredOutput) {
        const structuredRequest: ResponseCreateParamsNonStreaming = {
          model: request.model,
          instructions: request.systemPrompt,
          input: request.messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          text: {
            format: {
              type: 'json_schema',
              name: request.structuredOutput.name,
              description: request.structuredOutput.description,
              schema: request.structuredOutput.jsonSchema,
              strict: true,
            },
          },
        };

        const response = await this.client.responses.create(structuredRequest, {
          signal: controller.signal,
        });
        const rawText = response.output_text?.trim() ?? '';

        return {
          text: rawText,
          structuredData: rawText ? JSON.parse(rawText) : undefined,
          providerRequestId: response.id,
          finishReason:
            response.status === 'completed'
              ? 'stop'
              : response.status === 'incomplete'
                ? 'length'
                : response.status === 'failed'
                  ? 'error'
                  : 'unknown',
          latencyMs: Date.now() - startedAt,
          usage: response.usage
            ? {
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens,
                totalTokens: response.usage.total_tokens,
              }
            : undefined,
        };
      }

      const streamRequest: ResponseCreateParamsStreaming = {
        model: request.model,
        stream: true,
        instructions: request.systemPrompt,
        input: request.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        temperature: request.temperature,
      };

      const stream = await this.client.responses.create(streamRequest, {
        signal: controller.signal,
      });

      let text = '';
      let finalResponse: Response | null = null;

      for await (const event of stream as AsyncIterable<ResponseStreamEvent>) {
        if (event.type === 'response.output_text.delta' && event.delta) {
          text += event.delta;
          callbacks?.onChunk?.(event.delta);
        }

        if (event.type === 'response.output_text.done' && !text && event.text) {
          text = event.text;
        }

        if (event.type === 'response.completed') {
          finalResponse = event.response;
        }

        if (event.type === 'response.failed') {
          throw new Error(event.response.error?.message || 'OPENAI_RESPONSE_FAILED');
        }
      }

      const resolvedText = finalResponse?.output_text?.trim() || text.trim();

      return {
        text: resolvedText,
        providerRequestId: finalResponse?.id,
        finishReason:
          finalResponse?.status === 'completed'
            ? 'stop'
            : finalResponse?.status === 'incomplete'
              ? 'length'
              : finalResponse?.status === 'failed'
                ? 'error'
                : 'unknown',
        latencyMs: Date.now() - startedAt,
        usage: finalResponse?.usage
          ? {
              inputTokens: finalResponse.usage.input_tokens,
              outputTokens: finalResponse.usage.output_tokens,
              totalTokens: finalResponse.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('OPENAI_TIMEOUT');
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
