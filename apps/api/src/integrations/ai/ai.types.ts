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
  temperature?: number;
  topP?: number;
  maxNewTokens?: number;
  contextMaxChars?: number;
  structuredOutput?: {
    name: string;
    description?: string;
    jsonSchema: Record<string, unknown>;
  };
}

export interface AIProviderResponse {
  text: string;
  finishReason: 'stop' | 'length' | 'error' | 'unknown';
  latencyMs: number;
  structuredData?: unknown;
  providerRequestId?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface AIProviderErrorDescriptor {
  code: string;
  message: string;
  retryable: boolean;
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
