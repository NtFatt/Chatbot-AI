import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArtifactDrawer } from '../src/components/layout/ArtifactDrawer';
import type { ArtifactContent, StudyArtifact } from '@chatbot-ai/shared';

afterEach(cleanup);

const NOW = new Date().toISOString();

const makeArtifact = (
  overrides: Partial<StudyArtifact> & { content?: ArtifactContent } = {},
): StudyArtifact => ({
  id: 'artifact-1',
  userId: 'user-1',
  sessionId: 'session-1',
  messageId: 'message-1',
  type: 'summary',
  title: 'SQL Joins Summary',
  content: { bullets: ['Inner join returns matching rows', 'Outer join includes unmatched rows'] },
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
} as StudyArtifact);

describe('ArtifactDrawer', () => {
  const defaultProps = {
    isOpen: true,
    onClose: () => {},
    mode: 'session' as const,
    onModeChange: () => {},
    artifacts: [] as StudyArtifact[],
    isLoading: false,
    errorMessage: null,
    activeFilter: 'all' as const,
    onFilterChange: () => {},
    onDelete: () => {},
    sessionCount: 0,
  };

  it('does not render when isOpen is false', () => {
    render(<ArtifactDrawer {...defaultProps} isOpen={false} />);
    expect(document.querySelector('[class*="fixed"]')).toBeFalsy();
  });

  it('renders empty state when no artifacts exist', () => {
    render(<ArtifactDrawer {...defaultProps} />);
    expect(screen.getByText(/No artifacts in this session yet/i)).toBeTruthy();
    expect(screen.getByText(/Generate summaries, flashcards, or notes from responses/i)).toBeTruthy();
  });

  it('renders artifacts when provided', () => {
    const artifacts = [
      makeArtifact({ id: 'a1', title: 'First Summary' }),
      makeArtifact({ id: 'a2', title: 'Second Summary' }),
    ];
    render(<ArtifactDrawer {...defaultProps} artifacts={artifacts} />);
    expect(screen.getByText('First Summary')).toBeTruthy();
    expect(screen.getByText('Second Summary')).toBeTruthy();
  });

  it('calls onFilterChange when a filter tab is clicked', async () => {
    const onFilterChange = vi.fn();
    render(
      <ArtifactDrawer
        {...defaultProps}
        artifacts={[makeArtifact({ type: 'flashcard_set', content: [{ front: 'Q1', back: 'A1' }] })]}
        onFilterChange={onFilterChange}
      />,
    );

    const flashcardTab = screen.getByRole('button', { name: /Flashcards/i });
    await flashcardTab.click();

    expect(onFilterChange).toHaveBeenCalledWith('flashcard_set');
  });

  it('renders browse mode switch and calls onModeChange', async () => {
    const onModeChange = vi.fn();
    render(<ArtifactDrawer {...defaultProps} onModeChange={onModeChange} />);

    const favoritesMode = screen.getByRole('button', { name: /Favorites/i });
    await favoritesMode.click();

    expect(onModeChange).toHaveBeenCalledWith('favorites');
  });

  it('shows favorites-specific empty state copy', () => {
    render(<ArtifactDrawer {...defaultProps} mode="favorites" />);

    expect(screen.getByText(/No favorites yet/i)).toBeTruthy();
    expect(screen.getByText(/Favorite your best summaries/i)).toBeTruthy();
  });

  it('shows all-artifacts-specific empty state copy', () => {
    render(<ArtifactDrawer {...defaultProps} mode="all" />);

    expect(screen.getByText(/No saved artifacts yet/i)).toBeTruthy();
    expect(screen.getByText(/will appear here/i)).toBeTruthy();
  });

  it('renders error state when errorMessage is provided', () => {
    render(
      <ArtifactDrawer
        {...defaultProps}
        errorMessage="Request failed."
        mode="favorites"
      />,
    );

    expect(screen.getByText(/Could not load favorites/i)).toBeTruthy();
    expect(screen.getByText('Request failed.')).toBeTruthy();
  });

  it('shows only artifacts matching the active filter', () => {
    const artifacts = [
      makeArtifact({ id: 'a1', type: 'summary', title: 'Summary One' }),
      makeArtifact({ id: 'a2', type: 'flashcard_set', title: 'Flashcard One' }),
    ];
    render(<ArtifactDrawer {...defaultProps} artifacts={artifacts} activeFilter="summary" />);
    expect(screen.getByText('Summary One')).toBeTruthy();
    expect(screen.queryByText('Flashcard One')).toBeFalsy();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(<ArtifactDrawer {...defaultProps} onClose={onClose} />);
    const closeBtn = screen.getByRole('button', { name: /Close/i });
    await closeBtn.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders loading skeletons when isLoading is true', () => {
    render(<ArtifactDrawer {...defaultProps} isLoading={true} />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders all filter types with counts', () => {
    const artifacts = [
      makeArtifact({ id: 'a1', type: 'summary' }),
      makeArtifact({ id: 'a2', type: 'flashcard_set', content: [{ front: 'Q', back: 'A' }] }),
      makeArtifact({ id: 'a3', type: 'quiz_set', content: [{ question: 'Q', options: ['A'], answer: 0 }] }),
      makeArtifact({ id: 'a4', type: 'note', content: { body: 'Note body' } }),
    ];
    render(<ArtifactDrawer {...defaultProps} artifacts={artifacts} />);
    const summaryBtns = screen.getAllByText(/Summary/i);
    expect(summaryBtns.length).toBeGreaterThanOrEqual(1);
    const flashcardBtns = screen.getAllByText(/Flashcards/i);
    expect(flashcardBtns.length).toBeGreaterThanOrEqual(1);
    const quizBtns = screen.getAllByText(/Quiz/i);
    expect(quizBtns.length).toBeGreaterThanOrEqual(1);
    const noteBtns = screen.getAllByText(/Note/i);
    expect(noteBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('renders session count in the header', () => {
    render(<ArtifactDrawer {...defaultProps} mode="all" sessionCount={3} artifacts={[makeArtifact()]} />);
    expect(screen.getByText(/from 3 sessions/i)).toBeTruthy();
  });

  it('does not show session count in header when sessionCount is 0', () => {
    render(<ArtifactDrawer {...defaultProps} sessionCount={0} artifacts={[makeArtifact()]} />);
    expect(screen.getByText('1 item')).toBeTruthy();
    expect(screen.queryByText(/from 0 session/i)).toBeFalsy();
  });

  it('renders backdrop overlay that calls onClose on click', async () => {
    const onClose = vi.fn();
    render(<ArtifactDrawer {...defaultProps} onClose={onClose} />);
    const backdrop = document.querySelector('.fixed.inset-0');
    if (backdrop) {
      await backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
