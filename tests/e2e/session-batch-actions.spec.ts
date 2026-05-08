import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';

const NOW = new Date('2026-04-29T12:00:00.000Z').toISOString();

type SessionFixture = {
  id: string;
  title: string;
  providerPreference: 'GEMINI';
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
  isUnread: boolean;
};

const toSuccessEnvelope = <T>(data: T) => ({
  data,
  requestId: 'e2e-session-batch-request',
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

const makeSession = (overrides: Partial<SessionFixture>): SessionFixture => ({
  id: overrides.id ?? crypto.randomUUID(),
  title: overrides.title ?? 'Study Session',
  providerPreference: 'GEMINI',
  contextSummary: overrides.contextSummary ?? null,
  isPinned: overrides.isPinned ?? false,
  pinnedAt: overrides.pinnedAt ?? null,
  isArchived: overrides.isArchived ?? false,
  archivedAt: overrides.archivedAt ?? null,
  createdAt: overrides.createdAt ?? NOW,
  updatedAt: overrides.updatedAt ?? NOW,
  lastMessagePreview: overrides.lastMessagePreview ?? null,
  messageCount: overrides.messageCount ?? 3,
  artifactCount: overrides.artifactCount ?? 0,
  isUnread: overrides.isUnread ?? false,
});

const createSessionStore = () => {
  let activeSessions: SessionFixture[] = [
    makeSession({
      id: 'session-pinned',
      title: 'Pinned Database Review',
      isPinned: true,
      pinnedAt: NOW,
      updatedAt: NOW,
    }),
    makeSession({
      id: 'session-today',
      title: 'Today Session',
      updatedAt: NOW,
      lastMessagePreview: 'Discuss indexing strategy',
    }),
    makeSession({
      id: 'session-recent',
      title: 'Recent Session',
      updatedAt: new Date('2026-04-27T12:00:00.000Z').toISOString(),
    }),
  ];

  let archivedSessions: SessionFixture[] = [
    makeSession({
      id: 'archived-1',
      title: 'Archived SQL Basics',
      isArchived: true,
      archivedAt: NOW,
      updatedAt: new Date('2026-04-20T12:00:00.000Z').toISOString(),
    }),
  ];

  return {
    listActive: () => activeSessions,
    listArchived: () => archivedSessions,
    batchArchive: (sessionIds: string[]) => {
      const moved = activeSessions.filter((session) => sessionIds.includes(session.id));
      activeSessions = activeSessions.filter((session) => !sessionIds.includes(session.id));
      archivedSessions = [
        ...moved.map((session) => ({
          ...session,
          isArchived: true,
          archivedAt: NOW,
        })),
        ...archivedSessions,
      ];
    },
    batchDelete: (sessionIds: string[]) => {
      activeSessions = activeSessions.filter((session) => !sessionIds.includes(session.id));
      archivedSessions = archivedSessions.filter((session) => !sessionIds.includes(session.id));
    },
  };
};

const installSessionMocks = async (context: BrowserContext, store: ReturnType<typeof createSessionStore>) => {
  await context.route(/.*\/api\/chat\/sessions\?limit=20$/, async (route) => {
    const items = store.listActive();
    await fulfillJson(
      route,
      toSuccessEnvelope({
        hasMore: false,
        items,
        nextCursor: null,
        totalCount: items.length,
      }),
    );
  });

  await context.route(/.*\/api\/chat\/sessions\/archived\?limit=20$/, async (route) => {
    const items = store.listArchived();
    await fulfillJson(
      route,
      toSuccessEnvelope({
        hasMore: false,
        items,
        nextCursor: null,
        totalCount: items.length,
      }),
    );
  });

  await context.route('**/api/chat/sessions/continue-learning', async (route) => {
    await fulfillJson(route, toSuccessEnvelope({ items: [], total: 0 }));
  });

  await context.route(/.*\/api\/chat\/sessions\/[^/]+\/messages$/, async (route) => {
    await fulfillJson(route, toSuccessEnvelope({ items: [], total: 0 }));
  });

  await context.route(/.*\/api\/materials\/recommend.*/, async (route) => {
    await fulfillJson(route, toSuccessEnvelope({ items: [], total: 0 }));
  });

  await context.route(/.*\/api\/artifacts\/session\/[^/?]+$/, async (route) => {
    await fulfillJson(route, toSuccessEnvelope({ items: [], total: 0 }));
  });

  await context.route('**/api/providers', async (route) => {
    await fulfillJson(
      route,
      toSuccessEnvelope({
        defaultProvider: 'GEMINI',
        fallbackProvider: null,
        localFallbackEnabled: false,
        providers: [
          {
            key: 'GEMINI',
            enabled: true,
            configured: true,
            isPrimary: true,
            model: 'gemini-2.5-flash',
            timeoutMs: 15000,
            maxRetries: 2,
            healthState: 'healthy',
            cooldownRemainingMs: 0,
            runtimeSource: 'env',
          },
        ],
      }),
    );
  });

  await context.route('**/api/chat/sessions/batch-archive', async (route) => {
    const body = route.request().postDataJSON() as { sessionIds: string[] };
    store.batchArchive(body.sessionIds);
    await fulfillJson(route, toSuccessEnvelope({ archived: true, count: body.sessionIds.length }));
  });

  await context.route('**/api/chat/sessions/batch-delete', async (route) => {
    const body = route.request().postDataJSON() as { sessionIds: string[] };
    store.batchDelete(body.sessionIds);
    await fulfillJson(route, toSuccessEnvelope({ deleted: true, count: body.sessionIds.length }));
  });
};

const login = async (page: Page) => {
  await page.goto('/login');
  await page.getByTestId('guest-login-name').fill(`Batch E2E ${Date.now()}`);
  await page.getByTestId('guest-login-submit').click();
  await page.waitForURL('**/app');
};

test.describe('session batch actions', () => {
  test('supports multi-select archive and delete flows without breaking sidebar grouping', async ({ page }) => {
    const store = createSessionStore();
    await installSessionMocks(page.context(), store);
    await login(page);

    await expect(page.getByText('Đã ghim')).toBeVisible();
    await expect(page.getByText('Pinned Database Review')).toBeVisible();
    await expect(page.getByText('Today Session')).toBeVisible();

    await page.getByTestId('session-selection-mode-toggle').click();
    await page.getByTestId('session-item-session-pinned').click();
    await page.getByTestId('session-item-session-today').click();
    await expect(page.getByTestId('session-selection-count')).toContainText('2 selected');

    const archiveResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/chat/sessions/batch-archive') && response.request().method() === 'POST',
    );
    await page.getByTestId('session-batch-archive').click();
    await archiveResponse;
    await expect(page.getByText('Archived 2 sessions')).toBeVisible();
    await expect(page.getByText('Pinned Database Review')).toHaveCount(0);
    await expect(page.getByText('Today Session')).toHaveCount(0);

    await page.getByTitle(/Archived/).click();
    await expect(page.getByText('Archived SQL Basics')).toBeVisible();
    await expect(page.getByText('Pinned Database Review')).toBeVisible();

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.getByTestId('session-selection-mode-toggle').click();
    await page.getByTestId('session-item-archived-1').click();
    const deleteResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/api/chat/sessions/batch-delete') && response.request().method() === 'POST',
    );
    await page.getByTestId('session-batch-delete').click();
    await deleteResponse;
    await expect(page.getByText('Deleted 1 session')).toBeVisible();
    await expect(page.getByText('Archived SQL Basics')).toHaveCount(0);

    await page.getByTitle('Show active sessions').click();
    await page.getByTestId('session-item-session-recent').click();
    await expect(page.getByTestId('session-selection-count')).toHaveCount(0);
  });
});
