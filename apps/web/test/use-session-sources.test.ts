import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ChatMessage } from '@chatbot-ai/shared';

import { useSessionSources } from '../src/hooks/use-session-sources';

const makeMessage = (
  id: string,
  senderType: ChatMessage['senderType'],
  createdAt: string,
  retrievalSnapshot: ChatMessage['retrievalSnapshot'],
): ChatMessage =>
  ({
    id,
    sessionId: 'session-1',
    clientMessageId: id,
    parentClientMessageId: null,
    senderType,
    content: 'Test content',
    status: 'sent',
    provider: 'GEMINI',
    model: 'gemini-2.0-flash',
    providerRequestId: null,
    responseFinishReason: 'stop',
    latencyMs: 500,
    inputTokens: 100,
    outputTokens: 200,
    totalTokens: 300,
    fallbackUsed: false,
    retrievalSnapshot,
    errorCode: null,
    createdAt,
    updatedAt: createdAt,
  }) as ChatMessage;

const makeMaterial = (id: string, title: string) => ({
  id,
  title,
  url: `https://example.com/${id}`,
  snippet: 'Sample snippet',
  score: 80,
  reason: ['keyword match'],
  subjectLabel: 'Math',
  topicLabel: 'Algebra',
  type: 'article' as const,
  level: 'beginner' as const,
});

describe('useSessionSources', () => {
  it('returns empty when no messages', () => {
    const { result } = renderHook(() => useSessionSources([]));
    expect(result.current.materials).toHaveLength(0);
    expect(result.current.totalUnique).toBe(0);
    expect(result.current.mostUsed).toBeNull();
  });

  it('returns empty when no assistant messages have sources', () => {
    const messages: ChatMessage[] = [
      makeMessage('user-1', 'user', '2024-01-01T10:00:00Z', null),
    ];
    const { result } = renderHook(() => useSessionSources(messages));
    expect(result.current.materials).toHaveLength(0);
    expect(result.current.totalUnique).toBe(0);
  });

  it('returns empty when assistant messages have no retrieval snapshot', () => {
    const messages: ChatMessage[] = [
      makeMessage('user-1', 'user', '2024-01-01T10:00:00Z', null),
      makeMessage('assistant-1', 'assistant', '2024-01-01T10:01:00Z', null),
    ];
    const { result } = renderHook(() => useSessionSources(messages));
    expect(result.current.materials).toHaveLength(0);
  });

  it('returns empty when assistant messages have empty materials array', () => {
    const messages: ChatMessage[] = [
      makeMessage('user-1', 'user', '2024-01-01T10:00:00Z', null),
      makeMessage('assistant-1', 'assistant', '2024-01-01T10:01:00Z', {
        queryExpansion: [],
        materials: [],
      }),
    ];
    const { result } = renderHook(() => useSessionSources(messages));
    expect(result.current.materials).toHaveLength(0);
    expect(result.current.totalUnique).toBe(0);
  });

  it('correctly aggregates a single message with sources', () => {
    const mat1 = makeMaterial('mat-1', 'Material One');
    const mat2 = makeMaterial('mat-2', 'Material Two');
    const messages: ChatMessage[] = [
      makeMessage('assistant-1', 'assistant', '2024-01-01T10:01:00Z', {
        queryExpansion: [],
        materials: [mat1, mat2],
      }),
    ];
    const { result } = renderHook(() => useSessionSources(messages));
    expect(result.current.totalUnique).toBe(2);
    expect(result.current.materials.map((m) => m.id)).toEqual(['mat-1', 'mat-2']);
    expect(result.current.mostUsed?.id).toBe('mat-1');
    result.current.materials.forEach((m) => {
      expect(m.usageCount).toBe(1);
    });
  });

  it('deduplicates materials across multiple assistant messages', () => {
    const mat1 = makeMaterial('mat-1', 'Material One');
    const mat2 = makeMaterial('mat-2', 'Material Two');
    const mat3 = makeMaterial('mat-3', 'Material Three');
    const messages: ChatMessage[] = [
      makeMessage('assistant-1', 'assistant', '2024-01-01T10:01:00Z', {
        queryExpansion: [],
        materials: [mat1, mat2],
      }),
      makeMessage('assistant-2', 'assistant', '2024-01-01T10:02:00Z', {
        queryExpansion: [],
        materials: [mat2, mat3],
      }),
    ];
    const { result } = renderHook(() => useSessionSources(messages));
    expect(result.current.totalUnique).toBe(3);
    const mat2Result = result.current.materials.find((m) => m.id === 'mat-2');
    expect(mat2Result?.usageCount).toBe(2);
    expect(mat2Result?.lastUsedAt).toBe('2024-01-01T10:02:00Z');
  });

  it('sorts by usage count descending, then by most recent timestamp', () => {
    const mat1 = makeMaterial('mat-1', 'Material One');
    const mat2 = makeMaterial('mat-2', 'Material Two');
    const mat3 = makeMaterial('mat-3', 'Material Three');
    const messages: ChatMessage[] = [
      makeMessage('assistant-1', 'assistant', '2024-01-01T10:01:00Z', {
        queryExpansion: [],
        materials: [mat1],
      }),
      makeMessage('assistant-2', 'assistant', '2024-01-01T10:02:00Z', {
        queryExpansion: [],
        materials: [mat2],
      }),
      makeMessage('assistant-3', 'assistant', '2024-01-01T10:03:00Z', {
        queryExpansion: [],
        materials: [mat3, mat1],
      }),
    ];
    const { result } = renderHook(() => useSessionSources(messages));
    expect(result.current.materials[0]?.id).toBe('mat-1');
    expect(result.current.materials[0]?.usageCount).toBe(2);
    expect(result.current.materials[1]?.id).toBe('mat-3');
    expect(result.current.materials[1]?.usageCount).toBe(1);
    expect(result.current.materials[2]?.id).toBe('mat-2');
    expect(result.current.materials[2]?.usageCount).toBe(1);
  });

  it('skips user messages when aggregating sources', () => {
    const mat1 = makeMaterial('mat-1', 'Material One');
    const messages: ChatMessage[] = [
      makeMessage('user-1', 'user', '2024-01-01T10:00:00Z', null),
      makeMessage('assistant-1', 'assistant', '2024-01-01T10:01:00Z', {
        queryExpansion: [],
        materials: [mat1],
      }),
    ];
    const { result } = renderHook(() => useSessionSources(messages));
    expect(result.current.totalUnique).toBe(1);
    expect(result.current.materials[0]?.usageCount).toBe(1);
  });
});
