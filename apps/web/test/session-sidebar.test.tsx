import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { SessionSidebar } from '../src/components/layout/SessionSidebar';
import type { ChatSessionSummary, GlobalSearchResult } from '@chatbot-ai/shared';

afterEach(cleanup);

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const NOW = new Date().toISOString();
const DAY_MS = 86_400_000;

const makeSession = (overrides: Partial<ChatSessionSummary> = {}): ChatSessionSummary => ({
  id: 'session-1',
  title: 'SQL Joins Study',
  providerPreference: 'GEMINI',
  contextSummary: null,
  isPinned: false,
  pinnedAt: null,
  isArchived: false,
  archivedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  lastMessagePreview: 'Explain inner join vs outer join',
  messageCount: 5,
  artifactCount: 0,
  ...overrides,
});

const sessions: ChatSessionSummary[] = [
  makeSession({ id: 'today-1', title: 'Today Session', updatedAt: NOW }),
  makeSession({ id: 'today-2', title: 'Another Today', updatedAt: NOW }),
  makeSession({ id: 'yesterday-1', title: 'Yesterday Session', updatedAt: new Date(Date.now() - DAY_MS).toISOString() }),
  makeSession({ id: 'recent-1', title: 'Recent Session', updatedAt: new Date(Date.now() - DAY_MS * 3).toISOString() }),
  makeSession({ id: 'old-1', title: 'Old Session', updatedAt: new Date(Date.now() - DAY_MS * 60).toISOString() }),
];

describe('SessionSidebar', () => {
  const defaultProps = {
    sessions,
    archivedSessions: [] as ChatSessionSummary[],
    continueLearningSessions: [] as ChatSessionSummary[],
    activeSessionId: null as string | null,
    onCreate: () => {},
    onDelete: () => {},
    onPin: () => {},
    onArchive: () => {},
    onUnarchive: () => {},
    onRename: () => {},
    onOpenSettings: () => {},
    onSelect: () => {},
    onBatchArchive: () => Promise.resolve(),
    onBatchDelete: () => Promise.resolve(),
  };

  const Wrapper = createWrapper();

  it('renders session groups labeled by recency', () => {
    render(<SessionSidebar {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText('Hôm nay')).toBeTruthy();
    expect(screen.getByText('Hôm qua')).toBeTruthy();
    expect(screen.getByText('7 ngày gần đây')).toBeTruthy();
    expect(screen.getByText('Cũ hơn')).toBeTruthy();
  });

  it('renders each session title', () => {
    render(<SessionSidebar {...defaultProps} />, { wrapper: Wrapper });
    expect(screen.getByText('Today Session')).toBeTruthy();
    expect(screen.getByText('Yesterday Session')).toBeTruthy();
    expect(screen.getByText('Old Session')).toBeTruthy();
  });

  it('calls onSelect when a session is clicked', () => {
    const onSelect = vi.fn();
    render(<SessionSidebar {...defaultProps} onSelect={onSelect} />, { wrapper: Wrapper });
    const item = screen.getByText('Today Session').closest('[role="button"]') as HTMLElement;
    item?.click();
    expect(onSelect).toHaveBeenCalledWith('today-1');
  });

  it('calls onCreate when the new session button is clicked', () => {
    const onCreate = vi.fn();
    render(<SessionSidebar {...defaultProps} onCreate={onCreate} />, { wrapper: Wrapper });
    const buttons = screen.getAllByTitle('New conversation');
    (buttons[0] as HTMLElement).click();
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when the delete menu item is clicked', () => {
    const onDelete = vi.fn();
    render(<SessionSidebar {...defaultProps} onDelete={onDelete} />, { wrapper: Wrapper });
    const moreBtn = screen.getByTestId('session-menu-more-today-1');
    act(() => { fireEvent.click(moreBtn); });
    const deleteBtn = screen.getByTestId('session-menu-delete-today-1');
    act(() => { fireEvent.click(deleteBtn); });
    expect(onDelete).toHaveBeenCalledWith('today-1');
  });

  it('triggers useGlobalSearch when search input has 2+ characters', async () => {
    const user = userEvent.setup();
    render(<SessionSidebar {...defaultProps} />, { wrapper: Wrapper });
    const searchInput = screen.getByPlaceholderText(/Search all sessions/i) as HTMLInputElement;
    await user.type(searchInput, 'ab');
    expect(searchInput.value).toBe('ab');
  });

  it('clears search input when X button is clicked', async () => {
    const user = userEvent.setup();
    render(<SessionSidebar {...defaultProps} />, { wrapper: Wrapper });
    const searchInput = screen.getByPlaceholderText(/Search all sessions/i) as HTMLInputElement;
    await user.type(searchInput, 'test');
    expect(searchInput.value).toBe('test');
    const clearBtn = screen.getByRole('button', { name: '' });
    await user.click(clearBtn);
    expect(searchInput.value).toBe('');
  });

  it('shows empty state when no sessions exist', () => {
    render(<SessionSidebar {...defaultProps} sessions={[]} />, { wrapper: Wrapper });
    expect(screen.getByText(/No conversations yet/i)).toBeTruthy();
    expect(screen.getByText(/Ask your first question in the main workspace/i)).toBeTruthy();
  });

  it('shows archived sessions when showArchived is true', () => {
    const archived: ChatSessionSummary[] = [
      makeSession({
        id: 'archived-1',
        title: 'Archived Session',
        archivedAt: NOW,
        isArchived: true,
      }),
    ];
    render(<SessionSidebar {...defaultProps} archivedSessions={archived} showArchived={true} />, { wrapper: Wrapper });
    expect(screen.getByText('Archived')).toBeTruthy();
    expect(screen.getByText('Archived Session')).toBeTruthy();
  });

  it('shows archived count on the archive toggle button when sessions are archived', () => {
    const archived: ChatSessionSummary[] = [makeSession({ id: 'archived-1', archivedAt: NOW, isArchived: true })];
    render(<SessionSidebar {...defaultProps} archivedSessions={archived} />, { wrapper: Wrapper });
    expect(screen.getByTitle(/Archived \(1\)/)).toBeTruthy();
  });

  it('calls onPin when the pin menu item is clicked', () => {
    const onPin = vi.fn();
    render(<SessionSidebar {...defaultProps} onPin={onPin} />, { wrapper: Wrapper });
    const moreBtn = screen.getByTestId('session-menu-more-today-1');
    act(() => { fireEvent.click(moreBtn); });
    const pinBtn = screen.getByTestId('session-menu-pin-today-1');
    act(() => { fireEvent.click(pinBtn); });
    expect(onPin).toHaveBeenCalledWith('today-1', true);
  });

  it('calls onArchive when the archive menu item is clicked', () => {
    const onArchive = vi.fn();
    render(<SessionSidebar {...defaultProps} onArchive={onArchive} />, { wrapper: Wrapper });
    const moreBtn = screen.getByTestId('session-menu-more-today-1');
    act(() => { fireEvent.click(moreBtn); });
    const archiveBtn = screen.getByTestId('session-menu-archive-today-1');
    act(() => { fireEvent.click(archiveBtn); });
    expect(onArchive).toHaveBeenCalledWith('today-1');
  });

  it('enters selection mode and toggles selected sessions instead of opening them', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SessionSidebar {...defaultProps} onSelect={onSelect} />, { wrapper: Wrapper });

    await user.click(screen.getByTestId('session-selection-mode-toggle'));
    expect(screen.getByTestId('session-selection-count').textContent).toContain('0 selected');
    expect(screen.queryByTestId('session-menu-more-today-1')).toBeFalsy();

    await user.click(screen.getByTestId('session-item-today-1'));
    expect(screen.getByTestId('session-selection-count').textContent).toContain('1 selected');
    expect(onSelect).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('session-item-today-2'));
    expect(screen.getByTestId('session-selection-count').textContent).toContain('2 selected');
  });

  it('clears selection mode when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<SessionSidebar {...defaultProps} />, { wrapper: Wrapper });

    await user.click(screen.getByTestId('session-selection-mode-toggle'));
    await user.click(screen.getByTestId('session-item-today-1'));
    expect(screen.getByTestId('session-selection-count').textContent).toContain('1 selected');

    await user.click(screen.getByTestId('session-selection-clear'));
    expect(screen.queryByTestId('session-selection-count')).toBeFalsy();
    expect(screen.getByTestId('session-menu-more-today-1')).toBeTruthy();
  });

  it('disables search and hides continue-learning while selection mode is active', async () => {
    const user = userEvent.setup();
    render(
      <SessionSidebar
        {...defaultProps}
        continueLearningSessions={[
          makeSession({ id: 'continue-1', title: 'Review This', updatedAt: new Date(Date.now() - DAY_MS * 3).toISOString() }),
        ]}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('Tiếp tục học')).toBeTruthy();
    await user.click(screen.getByTestId('session-selection-mode-toggle'));

    expect(screen.queryByText('Tiếp tục học')).toBeFalsy();
    expect((screen.getByPlaceholderText(/Exit selection mode to search/i) as HTMLInputElement).disabled).toBe(true);
  });

  it('calls onBatchArchive with selected active sessions', async () => {
    const user = userEvent.setup();
    const onBatchArchive = vi.fn().mockResolvedValue(undefined);
    render(<SessionSidebar {...defaultProps} onBatchArchive={onBatchArchive} />, { wrapper: Wrapper });

    await user.click(screen.getByTestId('session-selection-mode-toggle'));
    await user.click(screen.getByTestId('session-item-today-1'));
    await user.click(screen.getByTestId('session-item-today-2'));
    await user.click(screen.getByTestId('session-batch-archive'));

    await waitFor(() => {
      expect(onBatchArchive).toHaveBeenCalledWith(['today-1', 'today-2']);
    });
    expect(screen.queryByTestId('session-selection-count')).toBeFalsy();
  });

  it('confirms and calls onBatchDelete in archived view', async () => {
    const user = userEvent.setup();
    const onBatchDelete = vi.fn().mockResolvedValue(undefined);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const archived: ChatSessionSummary[] = [
      makeSession({
        id: 'archived-1',
        title: 'Archived Session',
        archivedAt: NOW,
        isArchived: true,
      }),
      makeSession({
        id: 'archived-2',
        title: 'Archived Session 2',
        archivedAt: NOW,
        isArchived: true,
      }),
    ];

    render(
      <SessionSidebar
        {...defaultProps}
        archivedSessions={archived}
        onBatchDelete={onBatchDelete}
        showArchived={true}
      />,
      { wrapper: Wrapper },
    );

    await user.click(screen.getByTestId('session-selection-mode-toggle'));
    await user.click(screen.getByTestId('session-item-archived-1'));
    await user.click(screen.getByTestId('session-batch-delete'));

    await waitFor(() => {
      expect(onBatchDelete).toHaveBeenCalledWith(['archived-1'], 'archived');
    });
    expect(confirmSpy).toHaveBeenCalledWith('Delete 1 selected session? This cannot be undone.');
    confirmSpy.mockRestore();
  });

  it('renders session title without visible artifact badge in the row', () => {
    render(
      <SessionSidebar
        {...defaultProps}
        sessions={[makeSession({ id: 'has-artifacts', title: 'Session With Artifacts', artifactCount: 3 })]}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText('Session With Artifacts')).toBeTruthy();
  });

  it('renders pinned sessions in a dedicated Đã ghim group', () => {
    render(
      <SessionSidebar
        {...defaultProps}
        sessions={[
          makeSession({ id: 'pinned-today', title: 'Pinned Today', isPinned: true, updatedAt: NOW }),
          makeSession({ id: 'pinned-old', title: 'Pinned Old', isPinned: true, updatedAt: new Date(Date.now() - DAY_MS * 60).toISOString() }),
        ]}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText('Đã ghim')).toBeTruthy();
    expect(screen.getByText('Pinned Today')).toBeTruthy();
    expect(screen.getByText('Pinned Old')).toBeTruthy();
    expect(screen.queryByText('Hôm nay')).toBeFalsy();
    expect(screen.queryByText('Cũ hơn')).toBeFalsy();
  });

  it('renders Tiếp tục học section when continueLearningSessions are provided', () => {
    render(
      <SessionSidebar
        {...defaultProps}
        sessions={[]}
        continueLearningSessions={[
          makeSession({ id: 'continue-1', title: 'Review This', updatedAt: new Date(Date.now() - DAY_MS * 3).toISOString() }),
        ]}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText('Tiếp tục học')).toBeTruthy();
    expect(screen.getByText('Review This')).toBeTruthy();
  });

  it('renders session title without Tiếp tục badge in the row', () => {
    render(
      <SessionSidebar
        {...defaultProps}
        sessions={[]}
        continueLearningSessions={[
          makeSession({ id: 'continue-1', title: 'Review This', updatedAt: new Date(Date.now() - DAY_MS * 3).toISOString() }),
        ]}
      />,
      { wrapper: Wrapper },
    );
    expect(screen.getByText('Review This')).toBeTruthy();
    expect(screen.queryByText('Tiếp tục')).toBeFalsy();
  });

  it('opens context menu on right-click', async () => {
    const user = userEvent.setup();
    render(
      <SessionSidebar
        {...defaultProps}
        sessions={[makeSession({ id: 'ctx-1', title: 'Context Menu Session' })]}
      />,
      { wrapper: Wrapper },
    );
    const item = screen.getByText('Context Menu Session').closest('[role="button"]') as HTMLElement;
    await user.pointer({ target: item, keys: '[MouseRight]' });
    expect(screen.getByText('Rename')).toBeTruthy();
    expect(screen.getByText('Pin')).toBeTruthy();
    expect(screen.getByText('Archive')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('closes context menu on Escape', async () => {
    const user = userEvent.setup();
    render(
      <SessionSidebar
        {...defaultProps}
        sessions={[makeSession({ id: 'ctx-1', title: 'Context Menu Session' })]}
      />,
      { wrapper: Wrapper },
    );
    const item = screen.getByText('Context Menu Session').closest('[role="button"]') as HTMLElement;
    await user.pointer({ target: item, keys: '[MouseRight]' });
    expect(screen.getByText('Rename')).toBeTruthy();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByText('Rename')).toBeFalsy();
    });
  });

  it('opens rename input from context menu', async () => {
    const user = userEvent.setup();
    render(
      <SessionSidebar
        {...defaultProps}
        sessions={[makeSession({ id: 'ctx-1', title: 'Context Menu Session' })]}
      />,
      { wrapper: Wrapper },
    );
    const item = screen.getByText('Context Menu Session').closest('[role="button"]') as HTMLElement;
    await user.pointer({ target: item, keys: '[MouseRight]' });
    await user.click(screen.getByText('Rename'));
    const renameInput = screen.getByDisplayValue('Context Menu Session');
    expect(renameInput).toBeTruthy();
  });

  it('replaces session list with search results panel when query is 2+ chars', async () => {
    const user = userEvent.setup();
    render(
      <SessionSidebar
        {...defaultProps}
        sessions={[
          makeSession({ id: 's1', title: 'Session Title', contextSummary: 'Database optimization study material' }),
          makeSession({ id: 's2', title: 'Other Session', contextSummary: null }),
        ]}
      />,
      { wrapper: Wrapper },
    );
    const searchInput = screen.getByPlaceholderText(/Search all sessions/i) as HTMLInputElement;
    await user.type(searchInput, 'optimization');
    expect(searchInput.value).toBe('optimization');
  });
});
