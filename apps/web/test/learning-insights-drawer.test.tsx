import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LearningInsightsResponse } from '@chatbot-ai/shared';

import { LearningInsightsDrawer } from '../src/components/layout/LearningInsightsDrawer';

afterEach(cleanup);

const NOW = new Date('2026-04-29T12:00:00.000Z').toISOString();

const buildInsights = (overrides?: Partial<LearningInsightsResponse>): LearningInsightsResponse => ({
  summary: {
    totalSessions: 6,
    activeSessionsLast7Days: 3,
    totalArtifacts: 12,
    favoriteArtifacts: 4,
    lastActivityAt: NOW,
  },
  artifactBreakdown: [
    { type: 'summary', count: 5 },
    { type: 'flashcard_set', count: 3 },
    { type: 'quiz_set', count: 2 },
    { type: 'note', count: 2 },
  ],
  topSubjects: [
    { label: 'SQL', count: 4 },
    { label: 'Operating Systems', count: 2 },
  ],
  topTopics: [
    { label: 'JOIN', count: 3 },
    { label: 'Scheduling', count: 2 },
  ],
  topLevels: [
    { level: 'beginner', count: 3 },
    { level: 'intermediate', count: 2 },
  ],
  recentSessions: [
    {
      id: 'session-1',
      title: 'SQL Revision',
      providerPreference: 'GEMINI',
      aiRuntimeMode: 'external_api',
      contextSummary: 'Joins and indexes',
      isPinned: false,
      pinnedAt: null,
      isArchived: false,
      archivedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
      lastMessagePreview: 'Practice left joins and indexes.',
      messageCount: 6,
      artifactCount: 2,
      isUnread: true,
    },
  ],
  ...overrides,
});

describe('LearningInsightsDrawer', () => {
  const defaultProps = {
    continueLearningSessions: [],
    currentSessionId: null,
    errorMessage: null,
    insights: buildInsights(),
    isLoading: false,
    isOpen: true,
    onClose: () => {},
    onSelectSession: () => {},
    providerErrorMessage: null,
    providerIncidents: {
      items: [],
      total: 0,
    },
    providerLoading: false,
    providerMetrics: {
      items: [
        {
          provider: 'GEMINI' as const,
          totalRequests: 10,
          successCount: 8,
          failureCount: 2,
          fallbackCount: 1,
          avgLatencyMs: 420,
          totalTokens: 1800,
          estimatedCost: 0.0016,
          lastSeenAt: NOW,
        },
      ],
      total: 1,
    },
    providers: {
      defaultProvider: 'GEMINI' as const,
      fallbackProvider: 'OPENAI' as const,
      localFallbackEnabled: true,
      providers: [
        {
          key: 'GEMINI' as const,
          enabled: true,
          configured: true,
          isPrimary: true,
          model: 'gemini-2.5-flash',
          timeoutMs: 25000,
          maxRetries: 1,
          healthState: 'healthy' as const,
          cooldownRemainingMs: 0,
          runtimeSource: 'env' as const,
        },
      ],
    },
  };

  it('renders loading skeletons before insights data arrives', () => {
    render(
      <LearningInsightsDrawer
        {...defaultProps}
        insights={null}
        isLoading={true}
      />,
    );

    expect(screen.getByText('Learning Insights')).toBeTruthy();
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('renders empty state when no study history exists yet', () => {
    render(
      <LearningInsightsDrawer
        {...defaultProps}
        insights={buildInsights({
          summary: {
            totalSessions: 0,
            activeSessionsLast7Days: 0,
            totalArtifacts: 0,
            favoriteArtifacts: 0,
            lastActivityAt: null,
          },
          artifactBreakdown: [],
          topSubjects: [],
          topTopics: [],
          topLevels: [],
          recentSessions: [],
        })}
      />,
    );

    expect(screen.getByText(/No study history yet/i)).toBeTruthy();
    expect(screen.getByText(/Sessions, artifacts, and study focus will appear here/i)).toBeTruthy();
  });

  it('renders error state when insights request fails', () => {
    render(
      <LearningInsightsDrawer
        {...defaultProps}
        errorMessage="Request failed."
        insights={null}
      />,
    );

    expect(screen.getByText(/Could not load learning insights/i)).toBeTruthy();
    expect(screen.getByText('Request failed.')).toBeTruthy();
  });

  it('renders success state with KPIs, topic breakdowns, provider pulse, and session callback', async () => {
    const onSelectSession = vi.fn();
    render(
      <LearningInsightsDrawer
        {...defaultProps}
        continueLearningSessions={[
          {
            id: 'session-continue',
            title: 'Operating Systems Review',
            providerPreference: 'OPENAI',
            aiRuntimeMode: 'external_api',
            contextSummary: 'CPU scheduling',
            isPinned: false,
            pinnedAt: null,
            isArchived: false,
            archivedAt: null,
            createdAt: NOW,
            updatedAt: NOW,
            lastMessagePreview: 'Compare round-robin with shortest-job-first.',
            messageCount: 8,
            artifactCount: 3,
            isUnread: false,
          },
        ]}
        onSelectSession={onSelectSession}
      />,
    );

    expect(screen.getByText(/Study summary/i)).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText(/Artifact mix/i)).toBeTruthy();
    expect(screen.getByText('Summaries')).toBeTruthy();
    expect(screen.getByText(/Study focus/i)).toBeTruthy();
    expect(screen.getByText('SQL')).toBeTruthy();
    expect(screen.getByText('JOIN')).toBeTruthy();
    expect(screen.getByText(/Provider pulse/i)).toBeTruthy();
    expect(screen.getAllByText(/Healthy/i).length).toBeGreaterThan(0);

    await screen.getByRole('button', { name: /Operating Systems Review/i }).click();
    expect(onSelectSession).toHaveBeenCalledWith('session-continue');
  });
});
