import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ChatMessageBubble } from '../src/components/chat/ChatMessageBubble';

afterEach(cleanup);

describe('ChatMessageBubble', () => {
  it('renders provider metadata and retrieved sources for assistant messages', () => {
    render(
      <ChatMessageBubble
        message={{
          id: 'assistant-1',
          sessionId: 'session-1',
          clientMessageId: 'assistant-1',
          parentClientMessageId: 'user-1',
          senderType: 'assistant',
          content: '## Gợi ý học\n\nNội dung trả lời mẫu.',
          status: 'sent',
          provider: 'OPENAI',
          model: 'gpt-5.4-mini',
          providerRequestId: 'req-1',
          responseFinishReason: 'stop',
          latencyMs: 840,
          inputTokens: 120,
          outputTokens: 80,
          totalTokens: 200,
          confidenceScore: 0.81,
          confidenceLevel: 'high',
          subjectLabel: 'Hệ quản trị cơ sở dữ liệu',
          topicLabel: 'SQL joins',
          levelLabel: 'beginner',
          fallbackUsed: true,
          fallbackInfo: {
            localFallbackUsed: false,
            secondaryProviderUsed: true,
            notices: [
              {
                category: 'quota_exhausted',
                provider: 'GEMINI',
                retryAfterSeconds: 36,
                temporary: true,
                message: 'Gemini tạm thời bị giới hạn lượt gọi. Thử lại sau khoảng 36 giây.',
              },
              {
                category: 'secondary_provider_used',
                provider: 'GEMINI',
                fallbackProvider: 'OPENAI',
                temporary: true,
                message: 'OpenAI đã được dùng để trả lời thay cho Gemini.',
              },
            ],
          },
          retrievalSnapshot: {
            inferredSubject: 'Cơ sở dữ liệu',
            inferredTopic: 'SQL joins',
            queryExpansion: ['joins', 'subquery'],
            materials: [
              {
                id: 'material-1',
                title: 'SQL Query Patterns for Coursework',
                url: 'https://example.edu/sql',
                snippet: 'Covers joins, grouping, subqueries, and common pitfalls.',
                score: 82,
                reason: ['Matches query keywords'],
                subjectLabel: 'Hệ quản trị cơ sở dữ liệu',
                topicLabel: 'SQL và chuẩn hóa',
                type: 'article',
                level: 'beginner',
              },
            ],
          },
          errorCode: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }}
      />,
    );

    expect(screen.getByText(/^OPENAI$/i)).toBeTruthy();
    expect(screen.getByText(/^fallback$/i)).toBeTruthy();
    expect(screen.getByText(/200 tokens/i)).toBeTruthy();
    expect(screen.getByText(/Nguồn đã dùng/i)).toBeTruthy();
    expect(screen.getByText(/SQL Query Patterns for Coursework/i)).toBeTruthy();
    expect(screen.getAllByText(/1 nguồn/i)).toHaveLength(2);
    expect(screen.getByText(/Thử lại sau khoảng 36 giây/i)).toBeTruthy();
    expect(screen.getByText(/OpenAI đã được dùng để trả lời thay cho Gemini/i)).toBeTruthy();
  });

  it('renders the internal L3 tutor badge instead of Gemini/OpenAI metadata', () => {
    render(
      <ChatMessageBubble
        message={{
          id: 'assistant-l3',
          sessionId: 'session-l3',
          clientMessageId: 'assistant-l3',
          parentClientMessageId: 'user-l3',
          senderType: 'assistant',
          content: 'Internal L3 content',
          status: 'sent',
          provider: 'internal_l3_tutor',
          model: 'internal-l3-tutor-v1',
          modelVersionId: 'mv-internal',
          aiRuntimeMode: 'learning_engine_l3',
          learningEngineUsed: true,
          externalFallbackUsed: false,
          providerRequestId: null,
          responseFinishReason: 'stop',
          latencyMs: 12,
          inputTokens: null,
          outputTokens: null,
          totalTokens: null,
          confidenceScore: 0.82,
          confidenceLevel: 'high',
          subjectLabel: null,
          topicLabel: null,
          levelLabel: null,
          fallbackUsed: false,
          retrievalSnapshot: {
            queryExpansion: [],
            materials: [],
            aiRuntimeMode: 'learning_engine_l3',
            executionProvider: 'internal_l3_tutor',
            executionModel: 'internal-l3-tutor-v1',
            learningEngineUsed: true,
            externalFallbackUsed: false,
            modelVersionId: 'mv-internal',
          },
          errorCode: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }}
      />,
    );

    expect(screen.getByText('AI học tập Level 3')).toBeTruthy();
    expect(screen.getByText('L3 Tutor Model')).toBeTruthy();
    expect(screen.queryByText(/^GEMINI$/i)).toBeNull();
  });

  it('renders fallback wording when L3 uses an external provider fallback', () => {
    render(
      <ChatMessageBubble
        message={{
          id: 'assistant-l3-fallback',
          sessionId: 'session-l3',
          clientMessageId: 'assistant-l3-fallback',
          parentClientMessageId: 'user-l3',
          senderType: 'assistant',
          content: 'Fallback content',
          status: 'sent',
          provider: 'GEMINI',
          model: 'gemini-2.5-flash',
          modelVersionId: null,
          aiRuntimeMode: 'learning_engine_l3',
          learningEngineUsed: true,
          externalFallbackUsed: true,
          providerRequestId: null,
          responseFinishReason: 'stop',
          latencyMs: 40,
          inputTokens: null,
          outputTokens: null,
          totalTokens: null,
          confidenceScore: null,
          confidenceLevel: null,
          subjectLabel: null,
          topicLabel: null,
          levelLabel: null,
          fallbackUsed: true,
          fallbackInfo: null,
          retrievalSnapshot: {
            queryExpansion: [],
            materials: [],
            aiRuntimeMode: 'learning_engine_l3',
            executionProvider: 'GEMINI',
            executionModel: 'gemini-2.5-flash',
            learningEngineUsed: true,
            externalFallbackUsed: true,
          },
          errorCode: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }}
      />,
    );

    expect(screen.getByText('L3 fallback · GEMINI')).toBeTruthy();
    expect(screen.getByText(/^fallback$/i)).toBeTruthy();
  });
});
