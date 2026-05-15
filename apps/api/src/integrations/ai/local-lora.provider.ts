import { env } from '../../config/env';
import type { UsageService } from '../../modules/usage/usage.service';
import type { AIProvider, AIProviderRequest, AIProviderResponse } from './ai.types';
import { classifyProviderError } from './provider-runtime';

interface LocalLoraMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LocalLoraCompletionChoice {
  message?: {
    content?: string;
  };
  finish_reason?: string;
}

interface LocalLoraUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface LocalLoraCompletionResponse {
  choices?: LocalLoraCompletionChoice[];
  usage?: LocalLoraUsage;
}

export class LocalLoraProvider implements AIProvider {
  readonly key = 'local_lora';

  constructor(private readonly usageService?: UsageService) {}

  async generate(
    request: AIProviderRequest,
    callbacks?: { onChunk?: (chunk: string) => void },
  ): Promise<AIProviderResponse> {
    const startedAt = Date.now();

    if (!env.LOCAL_LORA_ENABLED) {
      throw new Error('LOCAL_LORA_ENABLED is false');
    }

    try {
      const formattedMessages: LocalLoraMessage[] = [];
      if (request.systemPrompt) {
        formattedMessages.push({ role: 'system', content: request.systemPrompt });
      }
      formattedMessages.push(
        ...request.messages.map((message) => ({ role: message.role, content: message.content })),
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), env.LOCAL_LORA_TIMEOUT_MS);

      const response = await fetch(`${env.LOCAL_LORA_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model || env.LOCAL_LORA_MODEL,
          messages: formattedMessages,
          temperature: request.temperature,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No response body');
        throw new Error(`Local inference server error: ${response.status} ${errorText}`);
      }

      const data = (await response.json()) as LocalLoraCompletionResponse;
      const firstChoice = data.choices?.[0];
      const generatedText = firstChoice?.message?.content ?? '';

      if (!generatedText) {
        throw new Error('Local inference server returned empty content');
      }

      return {
        text: generatedText,
        finishReason:
          firstChoice?.finish_reason === 'stop' ||
          firstChoice?.finish_reason === 'length' ||
          firstChoice?.finish_reason === 'error'
            ? firstChoice.finish_reason
            : 'stop',
        latencyMs: Math.max(1, Date.now() - startedAt),
        usage: {
          inputTokens: data.usage?.prompt_tokens,
          outputTokens: data.usage?.completion_tokens,
          totalTokens: data.usage?.total_tokens,
        },
      };
    } catch (error: unknown) {
      const errorDescriptor = classifyProviderError(error);
      throw Object.assign(new Error(`[local_lora] ${errorDescriptor.message}`), {
        provider: 'local_lora',
        descriptor: errorDescriptor,
      });
    }
  }
}
