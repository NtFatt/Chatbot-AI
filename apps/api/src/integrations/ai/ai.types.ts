import type { ProviderKey } from '@chatbot-ai/shared';

export interface AIConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIProviderRequest {
  provider: ProviderKey;
  model: string;
  systemPrompt: string;
  messages: AIConversationMessage[];
  timeoutMs: number;
}

export interface AIProviderResponse {
  text: string;
  finishReason: 'stop' | 'length' | 'error' | 'unknown';
  latencyMs: number;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface AIProvider {
  readonly key: ProviderKey;
  generate(
    request: AIProviderRequest,
    callbacks?: {
      onChunk?: (chunk: string) => void;
    },
  ): Promise<AIProviderResponse>;
}
