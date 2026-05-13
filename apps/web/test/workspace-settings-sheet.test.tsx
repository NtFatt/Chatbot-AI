import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceSettingsSheet } from '../src/components/layout/WorkspaceSettingsSheet';

afterEach(cleanup);

const defaultProps = {
  activeProvider: 'GEMINI' as const,
  aiRuntimeMode: 'external_api' as const,
  connectionState: 'connected' as const,
  currentSession: {
    id: 'session-1',
    title: 'Test Session',
    providerPreference: 'GEMINI' as const,
    aiRuntimeMode: 'external_api' as const,
    contextSummary: null,
    isPinned: false,
    pinnedAt: null,
    isArchived: false,
    archivedAt: null,
    createdAt: '2026-05-13T00:00:00.000Z',
    updatedAt: '2026-05-13T00:00:00.000Z',
    lastMessagePreview: null,
    messageCount: 0,
    artifactCount: 0,
  },
  diagnostics: {
    checkedAt: '2026-05-13T00:00:00.000Z',
    defaultProvider: 'GEMINI' as const,
    fallbackProvider: 'OPENAI' as const,
    localFallbackEnabled: true,
    providers: [],
    realAiAvailable: true,
  },
  diagnosticsLoading: false,
  draftTitle: 'Test Session',
  hasExternalProviders: true,
  isOpen: true,
  isRuntimeModePending: false,
  isSavingTitle: false,
  onClose: vi.fn(),
  onDraftTitleChange: vi.fn(),
  onLogout: vi.fn(),
  onProviderChange: vi.fn(),
  onRuntimeModeChange: vi.fn(),
  onRunDiagnostics: vi.fn(),
  onSaveTitle: vi.fn(),
  onToggleTheme: vi.fn(),
  providerIncidents: {
    items: [],
    totalCount: 0,
    total: 0,
    nextCursor: null,
    hasMore: false,
  },
  providerMetrics: {
    items: [],
    total: 0,
  },
  providerOptions: ['GEMINI', 'OPENAI'] as Array<'GEMINI' | 'OPENAI'>,
  theme: 'light' as const,
  usage: null,
};

describe('WorkspaceSettingsSheet', () => {
  it('renders both runtime mode options and handles mode switching', () => {
    render(<WorkspaceSettingsSheet {...defaultProps} />);

    expect(screen.getByTestId('runtime-mode-external_api')).toBeTruthy();
    expect(screen.getByTestId('runtime-mode-learning_engine_l3')).toBeTruthy();

    fireEvent.click(screen.getByTestId('runtime-mode-learning_engine_l3'));
    expect(defaultProps.onRuntimeModeChange).toHaveBeenCalledWith('learning_engine_l3');
  });

  it('shows the internal L3 helper copy', () => {
    render(
      <WorkspaceSettingsSheet
        {...defaultProps}
        aiRuntimeMode="learning_engine_l3"
        currentSession={{
          ...defaultProps.currentSession,
          aiRuntimeMode: 'learning_engine_l3',
        }}
      />,
    );

    expect(
      screen.getByText(/Dùng model nội bộ Level 3 của app/i),
    ).toBeTruthy();
    expect(
      screen.getByText(/không gọi Gemini\/OpenAI mặc định/i),
    ).toBeTruthy();
  });

  it('disables runtime mode buttons when pending or when no session is selected', () => {
    const { rerender } = render(
      <WorkspaceSettingsSheet {...defaultProps} isRuntimeModePending />,
    );

    expect((screen.getByTestId('runtime-mode-external_api') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId('runtime-mode-learning_engine_l3') as HTMLButtonElement).disabled).toBe(true);

    rerender(
      <WorkspaceSettingsSheet
        {...defaultProps}
        currentSession={null}
        isRuntimeModePending={false}
      />,
    );

    expect(screen.getByText(/Hãy tạo hoặc chọn một phiên học trước khi đổi chế độ AI/i)).toBeTruthy();
    expect((screen.getByTestId('runtime-mode-external_api') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId('runtime-mode-learning_engine_l3') as HTMLButtonElement).disabled).toBe(true);
  });
});
