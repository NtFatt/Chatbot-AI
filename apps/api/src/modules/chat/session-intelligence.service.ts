import {
  buildSessionSummarySystemPrompt,
  buildSessionSummaryUserPrompt,
  buildTurnIntelligenceSystemPrompt,
  buildTurnIntelligenceUserPrompt,
  sessionSummaryIntelligenceJsonSchema,
  sessionSummaryIntelligenceSchema,
  turnIntelligenceJsonSchema,
  turnIntelligenceSchema,
  type AppLanguage,
  type ChatMessage,
  type MaterialLevel,
  type ProviderKey,
  type RetrievalSnapshot,
} from '@chatbot-ai/shared';

import { truncateText, buildSessionTitle } from '../../utils/text';
import { StructuredOutputService } from '../../integrations/ai/structured-output.service';
import type { AIConversationMessage } from '../../integrations/ai/ai.types';

const DEFAULT_SESSION_TITLE = 'Tro chuyen moi / New study chat';

export interface TurnIntelligenceResult {
  subjectLabel: string | null;
  topicLabel: string | null;
  levelLabel: MaterialLevel | null;
  confidenceScore: number | null;
  titleSuggestion: string | null;
  warnings: string[];
}

export interface SessionSummaryResult {
  contextSummary: string;
  subjectLabel: string | null;
  topicLabel: string | null;
  levelLabel: MaterialLevel | null;
  titleSuggestion: string | null;
  warnings: string[];
}

export class SessionIntelligenceService {
  constructor(private readonly structuredOutputService: StructuredOutputService) {}

  private buildHeuristicTurnMetadata(input: {
    question: string;
    retrievalSnapshot?: RetrievalSnapshot | null;
    currentTitle?: string | null;
  }): TurnIntelligenceResult {
    return {
      subjectLabel: input.retrievalSnapshot?.inferredSubject ?? null,
      topicLabel: input.retrievalSnapshot?.inferredTopic ?? null,
      levelLabel: input.retrievalSnapshot?.materials[0]?.level ?? null,
      confidenceScore: null,
      titleSuggestion:
        input.currentTitle === DEFAULT_SESSION_TITLE ? buildSessionTitle(input.question) : null,
      warnings: ['Turn intelligence fell back to retrieval heuristics.'],
    };
  }

  private buildTranscript(messages: ChatMessage[]) {
    return messages
      .filter((message) => message.senderType !== 'system')
      .slice(-12)
      .map(
        (message) =>
          `${message.senderType === 'assistant' ? 'Assistant' : 'User'}: ${truncateText(
            message.content.replace(/\s+/g, ' ').trim(),
            420,
          )}`,
      )
      .join('\n\n');
  }

  async inferTurnMetadata(input: {
    userId: string;
    sessionId: string;
    requestedProvider?: ProviderKey;
    sessionProvider: ProviderKey;
    language: AppLanguage;
    currentTitle?: string | null;
    question: string;
    answer: string;
    retrievalSnapshot?: RetrievalSnapshot | null;
  }): Promise<TurnIntelligenceResult> {
    try {
      const result = await this.structuredOutputService.generate({
        userId: input.userId,
        sessionId: input.sessionId,
        requestedProvider: input.requestedProvider,
        sessionProvider: input.sessionProvider,
        schemaName: 'turn_intelligence',
        schemaDescription: 'Structured subject, topic, level, confidence, and title suggestion for a study chat turn.',
        schema: turnIntelligenceSchema,
        jsonSchema: turnIntelligenceJsonSchema,
        systemPrompt: buildTurnIntelligenceSystemPrompt(input.language),
        messages: [
          {
            role: 'user',
            content: buildTurnIntelligenceUserPrompt({
              question: input.question,
              answer: truncateText(input.answer, 2_400),
              retrievalContext: input.retrievalSnapshot?.materials
                .map(
                  (material) =>
                    `${material.title} (${material.subjectLabel}${material.topicLabel ? ` / ${material.topicLabel}` : ''})`,
                )
                .join('\n') ?? null,
              currentTitle: input.currentTitle ?? null,
            }),
          } satisfies AIConversationMessage,
        ],
      });

      return {
        subjectLabel: result.data.subjectLabel ?? null,
        topicLabel: result.data.topicLabel ?? null,
        levelLabel: result.data.levelLabel ?? null,
        confidenceScore: result.data.confidenceScore ?? null,
        titleSuggestion: result.data.titleSuggestion ?? null,
        warnings: result.warnings,
      };
    } catch {
      return this.buildHeuristicTurnMetadata({
        question: input.question,
        retrievalSnapshot: input.retrievalSnapshot,
        currentTitle: input.currentTitle,
      });
    }
  }

  async summarizeLongSession(input: {
    userId: string;
    sessionId: string;
    requestedProvider?: ProviderKey;
    sessionProvider: ProviderKey;
    language: AppLanguage;
    currentTitle?: string | null;
    existingSummary?: string | null;
    messages: ChatMessage[];
  }): Promise<SessionSummaryResult | null> {
    if (input.messages.length < 10) {
      return null;
    }

    try {
      const result = await this.structuredOutputService.generate({
        userId: input.userId,
        sessionId: input.sessionId,
        requestedProvider: input.requestedProvider,
        sessionProvider: input.sessionProvider,
        schemaName: 'session_summary_intelligence',
        schemaDescription: 'Compact structured context summary and topic metadata for a long study session.',
        schema: sessionSummaryIntelligenceSchema,
        jsonSchema: sessionSummaryIntelligenceJsonSchema,
        systemPrompt: buildSessionSummarySystemPrompt(input.language),
        messages: [
          {
            role: 'user',
            content: buildSessionSummaryUserPrompt({
              currentTitle: input.currentTitle ?? null,
              existingSummary: input.existingSummary ?? null,
              messagesTranscript: this.buildTranscript(input.messages),
            }),
          } satisfies AIConversationMessage,
        ],
      });

      return {
        contextSummary: result.data.contextSummary,
        subjectLabel: result.data.subjectLabel ?? null,
        topicLabel: result.data.topicLabel ?? null,
        levelLabel: result.data.levelLabel ?? null,
        titleSuggestion: result.data.titleSuggestion ?? null,
        warnings: result.warnings,
      };
    } catch {
      return null;
    }
  }
}
