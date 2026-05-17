import type { ProviderKey } from '@chatbot-ai/shared';

export interface AIConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type LocalLoraTaskCategory =
  | 'explain_concept'
  | 'give_example'
  | 'compare_concepts'
  | 'correct_student_answer'
  | 'generate_quiz'
  | 'generate_flashcards'
  | 'summarize_lesson'
  | 'study_plan'
  | 'source_grounded_answer'
  | 'fallback_transparency';

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
  taskCategory?: LocalLoraTaskCategory | null;
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
