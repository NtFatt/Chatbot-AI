import type { ProviderKey } from '../constants/providers';
import type { AIFinishReason, MessageStatus, SenderType } from '../constants/ui';

export interface ChatSessionSummary {
  id: string;
  title: string;
  providerPreference: ProviderKey;
  contextSummary: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string | null;
  messageCount: number;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  clientMessageId: string;
  senderType: SenderType;
  content: string;
  status: MessageStatus;
  provider: ProviderKey | null;
  model: string | null;
  latencyMs: number | null;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface AIChatRequest {
  sessionId: string;
  clientMessageId: string;
  message: string;
  provider?: ProviderKey;
}

export interface AIChatResult {
  provider: ProviderKey;
  model: string;
  contentMarkdown: string;
  finishReason: AIFinishReason;
  usage?: TokenUsage;
  latencyMs: number;
  fallbackUsed: boolean;
  warnings: string[];
  confidenceNote?: string;
}

export interface ChatAskResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  ai: AIChatResult;
}
