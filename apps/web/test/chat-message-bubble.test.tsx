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
});
