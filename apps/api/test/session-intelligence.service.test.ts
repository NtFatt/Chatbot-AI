import { describe, expect, it, vi } from 'vitest';

import type { ChatMessage } from '@chatbot-ai/shared';

import { env } from '../src/config/env';
import { SessionIntelligenceService } from '../src/modules/chat/session-intelligence.service';

const makeMessage = (index: number): ChatMessage => ({
  id: `message-${index}`,
  sessionId: 'session-1',
  clientMessageId: `client-${index}`,
  parentClientMessageId: index % 2 === 0 ? `client-${index - 1}` : null,
  senderType: index % 2 === 0 ? 'assistant' : 'user',
  content: `Nội dung học tập số ${index}`,
  status: 'sent',
  provider: index % 2 === 0 ? 'GEMINI' : null,
  model: index % 2 === 0 ? 'gemini-2.5-flash' : null,
  providerRequestId: null,
  responseFinishReason: index % 2 === 0 ? 'stop' : null,
  latencyMs: null,
  inputTokens: null,
  outputTokens: null,
  totalTokens: null,
  confidenceScore: null,
  confidenceLevel: null,
  subjectLabel: null,
  topicLabel: null,
  levelLabel: null,
  fallbackUsed: false,
  retrievalSnapshot: null,
  errorCode: null,
  createdAt: new Date(2026, 3, 28, 12, index).toISOString(),
  updatedAt: new Date(2026, 3, 28, 12, index).toISOString(),
});

describe('SessionIntelligenceService', () => {
  it('falls back to retrieval heuristics when structured turn intelligence fails', async () => {
    const service = new SessionIntelligenceService({
      generate: vi.fn().mockRejectedValue(new Error('Structured output unavailable')),
    } as never);

    const result = await service.inferTurnMetadata({
      userId: 'user-1',
      sessionId: 'session-1',
      sessionProvider: 'GEMINI',
      language: 'vi',
      currentTitle: 'Tro chuyen moi / New study chat',
      question: 'Giải thích chuẩn hóa dữ liệu là gì',
      answer: 'Chuẩn hóa dữ liệu giúp giảm dư thừa.',
      retrievalSnapshot: {
        inferredSubject: 'Hệ quản trị cơ sở dữ liệu',
        inferredTopic: 'Chuẩn hóa dữ liệu',
        queryExpansion: ['chuẩn hóa', 'database normalization'],
        materials: [
          {
            id: 'material-1',
            title: 'Chuẩn hóa dữ liệu 1NF đến BCNF',
            url: 'https://example.edu/normalization',
            snippet: 'Giải thích luồng tách bảng và phụ thuộc hàm.',
            score: 88,
            reason: ['Matches topic intent'],
            subjectLabel: 'Hệ quản trị cơ sở dữ liệu',
            topicLabel: 'Chuẩn hóa dữ liệu',
            type: 'article',
            level: 'beginner',
          },
        ],
        promptContext: 'Material context',
      },
    });

    expect(result.subjectLabel).toBe('Hệ quản trị cơ sở dữ liệu');
    expect(result.topicLabel).toBe('Chuẩn hóa dữ liệu');
    expect(result.levelLabel).toBe('beginner');
    expect(result.confidenceScore).toBe(0.78);
    expect(result.titleSuggestion).toBeTruthy();
    expect(result.warnings).toContain('Turn intelligence fell back to retrieval heuristics.');
  });

  it('uses local heuristics in learning_engine_l3 without calling structured output', async () => {
    const generate = vi.fn();
    const service = new SessionIntelligenceService({ generate } as never);
    const originalFlag = env.L3_ALLOW_EXTERNAL_FALLBACK;
    env.L3_ALLOW_EXTERNAL_FALLBACK = false;

    const result = await service.inferTurnMetadata({
      userId: 'user-1',
      sessionId: 'session-1',
      aiRuntimeMode: 'learning_engine_l3',
      sessionProvider: 'GEMINI',
      language: 'vi',
      currentTitle: 'Tro chuyen moi / New study chat',
      question: 'Giải thích tính đóng gói trong Java',
      answer: 'Tính đóng gói giúp che giấu dữ liệu nội bộ.',
      retrievalSnapshot: {
        inferredSubject: 'Lập trình Java',
        inferredTopic: 'Tính đóng gói',
        queryExpansion: ['encapsulation'],
        materials: [],
      },
    });

    env.L3_ALLOW_EXTERNAL_FALLBACK = originalFlag;

    expect(generate).not.toHaveBeenCalled();
    expect(result.topicLabel).toBe('Tính đóng gói');
    expect(result.warnings).toContain('Turn intelligence used local L3 heuristics.');
  });

  it('returns null for AI session summaries on short sessions', async () => {
    const generate = vi.fn();
    const service = new SessionIntelligenceService({ generate } as never);

    const result = await service.summarizeLongSession({
      userId: 'user-1',
      sessionId: 'session-1',
      sessionProvider: 'GEMINI',
      language: 'vi',
      currentTitle: 'Database review',
      existingSummary: null,
      messages: Array.from({ length: 9 }, (_, index) => makeMessage(index + 1)),
    });

    expect(result).toBeNull();
    expect(generate).not.toHaveBeenCalled();
  });

  it('normalizes structured AI summary output for long sessions', async () => {
    const service = new SessionIntelligenceService({
      generate: vi.fn().mockResolvedValue({
        data: {
          contextSummary: 'Buổi học tập trung vào chuẩn hóa dữ liệu và JOIN.',
          subjectLabel: 'Hệ quản trị cơ sở dữ liệu',
          topicLabel: 'JOIN và chuẩn hóa',
          levelLabel: 'intermediate',
          titleSuggestion: 'Chuẩn hóa dữ liệu và JOIN',
        },
        warnings: ['Summary generated from the last 12 turns only.'],
      }),
    } as never);

    const result = await service.summarizeLongSession({
      userId: 'user-1',
      sessionId: 'session-1',
      sessionProvider: 'GEMINI',
      language: 'vi',
      currentTitle: 'Tro chuyen moi / New study chat',
      existingSummary: null,
      messages: Array.from({ length: 10 }, (_, index) => makeMessage(index + 1)),
    });

    expect(result).toMatchObject({
      contextSummary: 'Buổi học tập trung vào chuẩn hóa dữ liệu và JOIN.',
      subjectLabel: 'Hệ quản trị cơ sở dữ liệu',
      topicLabel: 'JOIN và chuẩn hóa',
      levelLabel: 'intermediate',
      titleSuggestion: 'Chuẩn hóa dữ liệu và JOIN',
    });
    expect(result?.warnings).toContain('Summary generated from the last 12 turns only.');
  });

  it('uses deterministic local summaries for learning_engine_l3 by default', async () => {
    const generate = vi.fn();
    const service = new SessionIntelligenceService({ generate } as never);
    const originalFlag = env.L3_ALLOW_EXTERNAL_FALLBACK;
    env.L3_ALLOW_EXTERNAL_FALLBACK = false;

    const result = await service.summarizeLongSession({
      userId: 'user-1',
      sessionId: 'session-1',
      aiRuntimeMode: 'learning_engine_l3',
      sessionProvider: 'GEMINI',
      language: 'vi',
      currentTitle: 'Tro chuyen moi / New study chat',
      existingSummary: null,
      messages: Array.from({ length: 10 }, (_, index) => makeMessage(index + 1)),
    });

    env.L3_ALLOW_EXTERNAL_FALLBACK = originalFlag;

    expect(generate).not.toHaveBeenCalled();
    expect(result?.contextSummary).toBeTruthy();
    expect(result?.warnings).toContain('Session summary used local L3 heuristics.');
  });
});
