import type { ProviderKey } from '../constants/providers';
import type { AIFinishReason, MessageStatus, SenderType } from '../constants/ui';
import type { RetrievalSnapshot } from './materials';

export interface ChatSessionSummary {
  id: string;
  title: string;
  providerPreference: ProviderKey;
  contextSummary: string | null;
  isPinned: boolean;
  pinnedAt: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string | null;
  messageCount: number;
  artifactCount: number;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  clientMessageId: string;
  parentClientMessageId: string | null;
  senderType: SenderType;
  content: string;
  status: MessageStatus;
  provider: ProviderKey | null;
  model: string | null;
  providerRequestId: string | null;
  responseFinishReason: AIFinishReason | null;
  latencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  fallbackUsed: boolean;
  retrievalSnapshot: RetrievalSnapshot | null;
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
  providerRequestId?: string;
  retrievalSnapshot?: RetrievalSnapshot | null;
}

export interface ChatAskResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  ai: AIChatResult;
}
