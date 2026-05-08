import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';

const NOW = new Date('2026-04-29T12:00:00.000Z').toISOString();

const toSuccessEnvelope = <T>(data: T) => ({
  data,
  requestId: 'e2e-insights-request',
  success: true,
  timestamp: NOW,
});

const fulfillJson = async (route: Route, body: unknown, status = 200) => {
  await route.fulfill({
    body: JSON.stringify(body),
    contentType: 'application/json',
    status,
  });
};

const loginAsGuest = async (page: Page) => {
  await page.goto('/login');
  await page.getByTestId('guest-login-name').fill(`Insights E2E ${Date.now()}`);
  await page.getByTestId('guest-login-submit').click();
  await page.waitForURL('**/app');
};

const installInsightsMocks = async (context: BrowserContext) => {
  await context.route('**/api/insights/learning', async (route) => {
    await fulfillJson(route, toSuccessEnvelope({
      summary: {
        totalSessions: 7,
        activeSessionsLast7Days: 4,
        totalArtifacts: 13,
        favoriteArtifacts: 5,
        lastActivityAt: NOW,
      },
      artifactBreakdown: [
        { type: 'summary', count: 5 },
        { type: 'flashcard_set', count: 4 },
        { type: 'quiz_set', count: 2 },
        { type: 'note', count: 2 },
      ],
      topSubjects: [{ label: 'SQL', count: 4 }],
      topTopics: [{ label: 'JOIN', count: 3 }],
      topLevels: [{ level: 'beginner', count: 3 }],
      recentSessions: [
        {
          id: 'session-recent-1',
          title: 'SQL Revision',
          providerPreference: 'GEMINI',
          contextSummary: 'Joins and indexing',
          isPinned: false,
          pinnedAt: null,
          isArchived: false,
          archivedAt: null,
          createdAt: NOW,
          updatedAt: NOW,
          lastMessagePreview: 'Review left joins and indexes.',
          messageCount: 6,
          artifactCount: 2,
          isUnread: false,
        },
      ],
    }));
  });

  await context.route('**/api/chat/sessions/continue-learning', async (route) => {
    await fulfillJson(route, toSuccessEnvelope({
      items: [
        {
          id: 'session-continue-1',
          title: 'Operating Systems Review',
          providerPreference: 'OPENAI',
          contextSummary: 'Scheduling algorithms',
          isPinned: false,
          pinnedAt: null,
          isArchived: false,
          archivedAt: null,
          createdAt: NOW,
          updatedAt: NOW,
          lastMessagePreview: 'Compare round-robin and SJF.',
          messageCount: 8,
          artifactCount: 3,
          isUnread: true,
        },
      ],
      total: 1,
    }));
  });

  await context.route('**/api/providers', async (route) => {
    await fulfillJson(route, toSuccessEnvelope({
      defaultProvider: 'GEMINI',
      fallbackProvider: 'OPENAI',
      localFallbackEnabled: true,
      providers: [
        {
          key: 'GEMINI',
          enabled: true,
          configured: true,
          isPrimary: true,
          model: 'gemini-2.5-flash',
          timeoutMs: 25000,
          maxRetries: 1,
          healthState: 'healthy',
          cooldownRemainingMs: 0,
          runtimeSource: 'env',
        },
        {
          key: 'OPENAI',
          enabled: false,
          configured: false,
          isPrimary: false,
          model: 'gpt-5.4-mini',
          timeoutMs: 25000,
          maxRetries: 1,
          healthState: 'degraded',
          cooldownRemainingMs: 0,
          runtimeSource: 'env',
        },
      ],
    }));
  });

  await context.route('**/api/providers/metrics', async (route) => {
    await fulfillJson(route, toSuccessEnvelope({
      items: [
        {
          provider: 'GEMINI',
          totalRequests: 12,
          successCount: 10,
          failureCount: 2,
          fallbackCount: 1,
          avgLatencyMs: 410,
          totalTokens: 2200,
          estimatedCost: 0.0019,
          lastSeenAt: NOW,
        },
      ],
      total: 1,
    }));
  });

  await context.route('**/api/providers/incidents?limit=12', async (route) => {
    await fulfillJson(route, toSuccessEnvelope({
      items: [],
      total: 0,
    }));
  });
};

test.describe('learning insights surface', () => {
  test('renders lightweight analytics and provider pulse without breaking the workspace shell', async ({ page }) => {
    await installInsightsMocks(page.context());
    await loginAsGuest(page);

    await page.getByTitle('Learning insights').click();
    const drawer = page.getByTestId('learning-insights-drawer');

    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('Learning Insights')).toBeVisible();
    await expect(drawer.getByTestId('learning-kpi-sessions')).toContainText('7');
    await expect(drawer.getByTestId('learning-kpi-artifacts')).toContainText('13');
    await expect(drawer.getByText('SQL')).toBeVisible();
    await expect(drawer.getByText('Operating Systems Review')).toBeVisible();
    await expect(drawer.getByTestId('learning-provider-pulse-status')).toHaveText('Healthy');

    await drawer.getByTitle('Close').click();
    await expect(drawer).toHaveCount(0);
  });
});
