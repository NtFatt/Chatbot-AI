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

const clampWithEllipsis = (value: string, maxChars: number) => {
  if (value.length <= maxChars) {
    return value;
  }

  if (maxChars <= 32) {
    return value.slice(0, maxChars);
  }

  const head = Math.ceil(maxChars * 0.55);
  const tail = Math.max(0, maxChars - head - 7);
  return `${value.slice(0, head)}\n...\n${value.slice(value.length - tail)}`;
};

const trimMessagesForLocalLora = (
  systemPrompt: string | undefined,
  messages: AIProviderRequest['messages'],
  contextMaxChars: number,
) => {
  const trimmed: LocalLoraMessage[] = [];
  let remaining = contextMaxChars;

  if (systemPrompt) {
    const normalizedSystemPrompt = systemPrompt.trim();
    if (normalizedSystemPrompt) {
      const systemBudget = Math.min(remaining, Math.min(1500, Math.max(200, Math.floor(contextMaxChars * 0.3))));
      const cappedSystemPrompt = clampWithEllipsis(normalizedSystemPrompt, systemBudget);
      trimmed.push({ role: 'system', content: cappedSystemPrompt });
      remaining = Math.max(0, remaining - cappedSystemPrompt.length);
    }
  }

  const reversedMessages = [...messages].reverse();
  const keptMessages: LocalLoraMessage[] = [];
  for (const message of reversedMessages) {
    if (remaining <= 0) {
      break;
    }

    const normalizedContent = message.content.trim();
    if (!normalizedContent) {
      continue;
    }

    const cappedContent = clampWithEllipsis(normalizedContent, Math.min(remaining, normalizedContent.length));
    keptMessages.push({
      role: message.role,
      content: cappedContent,
    });
    remaining = Math.max(0, remaining - cappedContent.length);
  }

  return [...trimmed, ...keptMessages.reverse()];
};

export class LocalLoraProvider implements AIProvider {
  readonly key = 'local_lora';

  constructor(private readonly usageService?: UsageService) {}

  async generate(
    request: AIProviderRequest,
    callbacks?: { onChunk?: (chunk: string) => void },
  ): Promise<AIProviderResponse> {
    const startedAt = Date.now();
    const timeoutMs = request.timeoutMs ?? env.LOCAL_LORA_TIMEOUT_MS;

    if (!env.LOCAL_LORA_ENABLED) {
      const errorDescriptor = classifyProviderError(new Error('LOCAL_LORA_ENABLED is false'));
      throw Object.assign(new Error(`[local_lora] ${errorDescriptor.message}`), {
        provider: 'local_lora',
        descriptor: errorDescriptor,
      });
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      const formattedMessages = trimMessagesForLocalLora(
        request.systemPrompt,
        request.messages,
        request.contextMaxChars ?? env.LOCAL_LORA_CONTEXT_MAX_CHARS,
      );

      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const maxNewTokens = request.maxNewTokens ?? env.LOCAL_LORA_MAX_NEW_TOKENS;
      const temperature = request.temperature ?? env.LOCAL_LORA_TEMPERATURE;
      const topP = request.topP ?? env.LOCAL_LORA_TOP_P;

      const response = await fetch(`${env.LOCAL_LORA_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: request.model || env.LOCAL_LORA_MODEL,
          messages: formattedMessages,
          temperature,
          max_new_tokens: maxNewTokens,
          top_p: topP,
        }),
        signal: controller.signal,
      });

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
      const normalizedError =
        error instanceof Error && error.name === 'AbortError'
          ? new Error(`LOCAL_LORA_TIMEOUT after ${timeoutMs}ms`)
          : error;
      const errorDescriptor = classifyProviderError(normalizedError);
      throw Object.assign(new Error(`[local_lora] ${errorDescriptor.message}`), {
        provider: 'local_lora',
        descriptor: errorDescriptor,
      });
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }
}
