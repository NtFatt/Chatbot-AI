import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ArtifactPreview } from '../src/components/chat/ArtifactPreview';
import type { FlashcardCard, QuizQuestion, SummaryContent, StudyArtifact } from '@chatbot-ai/shared';

// Mock clipboard API
const mockClipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
Object.defineProperty(navigator, 'clipboard', { value: mockClipboard, configurable: true, writable: true });

// Mock sonner toast
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(() => {
  cleanup();
});

const NOW = new Date().toISOString();

const makeArtifact = (overrides: Partial<StudyArtifact> = {}): StudyArtifact => ({
  id: 'artifact-1',
  userId: 'user-1',
  sessionId: 'session-1',
  sessionTitle: null,
  messageId: 'message-1',
  type: 'summary',
  title: 'SQL Joins Summary',
  isFavorited: false,
  qualityScore: null,
  content: {
    bullets: ['Inner join returns matching rows', 'Outer join includes unmatched rows'],
    keyTerms: ['join', 'SQL', 'relational'],
  } satisfies SummaryContent,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
} as StudyArtifact);

describe('ArtifactPreview', () => {
  it('renders summary artifact with bullets and key terms', () => {
    render(<ArtifactPreview artifact={makeArtifact()} />);
    expect(screen.getByText('SQL Joins Summary')).toBeTruthy();
    expect(screen.getByText('Inner join returns matching rows')).toBeTruthy();
    expect(screen.getByText('Outer join includes unmatched rows')).toBeTruthy();
    expect(screen.getByText('join')).toBeTruthy();
    expect(screen.getByText('SQL')).toBeTruthy();
  });

  it('renders flashcard artifact with interactive flip cards', () => {
    const artifact = makeArtifact({
      type: 'flashcard_set',
      title: 'SQL Flashcards',
      content: [
        { front: 'What is a primary key?', back: 'A column that uniquely identifies each row' } satisfies FlashcardCard,
        { front: 'What is a foreign key?', back: 'A column that references the primary key of another table' } satisfies FlashcardCard,
        { front: 'What is normalization?', back: 'The process of organizing data to reduce redundancy' } satisfies FlashcardCard,
        { front: 'What is a JOIN?', back: 'Combines rows from two or more tables' } satisfies FlashcardCard,
        { front: 'What is indexing?', back: 'A data structure to speed up data retrieval' } satisfies FlashcardCard,
        { front: 'What is a transaction?', back: 'A sequence of operations performed as a single unit' } satisfies FlashcardCard,
      ],
    });
    render(<ArtifactPreview artifact={artifact} />);
    expect(screen.getByText('SQL Flashcards')).toBeTruthy();
    expect(screen.getByText('What is a primary key?')).toBeTruthy();
  });

  it('limits flashcard display to 5 cards and shows count of remaining', () => {
    const cards: FlashcardCard[] = [
      { front: 'Card 1', back: 'Answer 1' },
      { front: 'Card 2', back: 'Answer 2' },
      { front: 'Card 3', back: 'Answer 3' },
      { front: 'Card 4', back: 'Answer 4' },
      { front: 'Card 5', back: 'Answer 5' },
      { front: 'Card 6', back: 'Answer 6' },
      { front: 'Card 7', back: 'Answer 7' },
    ];
    const artifact = makeArtifact({ type: 'flashcard_set', title: 'Many Flashcards', content: cards });
    render(<ArtifactPreview artifact={artifact} />);
    expect(screen.getByText('+2 more cards')).toBeTruthy();
  });

  it('renders quiz artifact with MCQ questions', () => {
    const questions: QuizQuestion[] = [
      {
        question: 'Which join returns all rows from both tables?',
        options: ['Inner Join', 'Left Join', 'Full Outer Join', 'Cross Join'],
        answer: 2,
        explanation: 'Full Outer Join returns all rows when there is a match in either table.',
      },
      {
        question: 'What does GROUP BY do?',
        options: ['Filters rows', 'Sorts results', 'Groups rows with same values', 'Joins tables'],
        answer: 2,
      },
      {
        question: 'Which is not a type of join?',
        options: ['Inner', 'Outer', 'Vertical', 'Cross'],
        answer: 2,
      },
    ];
    const artifact = makeArtifact({ type: 'quiz_set', title: 'SQL Quiz', content: questions });
    render(<ArtifactPreview artifact={artifact} />);
    expect(screen.getByText('SQL Quiz')).toBeTruthy();
    expect(screen.getByText(/Which join returns all rows/i)).toBeTruthy();
    expect(screen.getByText(/What does GROUP BY do/i)).toBeTruthy();
  });

  it('renders note artifact with body and tags', () => {
    const artifact = makeArtifact({
      type: 'note',
      title: 'Study Note on SQL',
      content: {
        body: 'SQL (Structured Query Language) is used for managing relational databases.',
        tags: ['sql', 'database', 'basics'],
      },
    });
    render(<ArtifactPreview artifact={artifact} />);
    expect(screen.getByText('Study Note on SQL')).toBeTruthy();
    expect(screen.getByText('#sql')).toBeTruthy();
    expect(screen.getByText('#database')).toBeTruthy();
  });

  it('calls onDelete when the delete button is clicked', () => {
    const onDelete = vi.fn();
    const { container } = render(<ArtifactPreview artifact={makeArtifact()} onDelete={onDelete} />);
    const deleteBtn = container.querySelector('[title="Delete artifact"]') as HTMLElement | null;
    deleteBtn?.click();
    expect(onDelete).toHaveBeenCalledWith('artifact-1');
  });

  it('renders export and share actions and triggers callbacks', () => {
    const onExport = vi.fn();
    const onShare = vi.fn();
    const onRevokeShare = vi.fn();

    render(
      <ArtifactPreview
        artifact={makeArtifact({ isShared: true })}
        onExport={onExport}
        onShare={onShare}
        onRevokeShare={onRevokeShare}
      />,
    );

    screen.getByTitle('Export markdown').click();
    screen.getByTitle('Copy share link').click();
    screen.getByTitle('Revoke share link').click();

    expect(onExport).toHaveBeenCalledWith(expect.objectContaining({ id: 'artifact-1' }));
    expect(onShare).toHaveBeenCalledWith(expect.objectContaining({ id: 'artifact-1' }));
    expect(onRevokeShare).toHaveBeenCalledWith(expect.objectContaining({ id: 'artifact-1' }));
  });

  it('supports editing, saving, and canceling summary artifacts', async () => {
    const onSaveContent = vi.fn();
    render(<ArtifactPreview artifact={makeArtifact()} onSaveContent={onSaveContent} />);

    await act(async () => {
      screen.getByText('Edit').click();
    });

    const textarea = screen.getAllByRole('textbox')[0]!;
    fireEvent.change(textarea, {
      target: {
        value: 'Updated bullet 1\nUpdated bullet 2\nUpdated bullet 3',
      },
    });

    await act(async () => {
      screen.getByText('Save').click();
    });

    expect(onSaveContent).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'artifact-1' }),
      {
        bullets: ['Updated bullet 1', 'Updated bullet 2', 'Updated bullet 3'],
        keyTerms: ['join', 'SQL', 'relational'],
      },
    );

    cleanup();
    onSaveContent.mockClear();
    render(<ArtifactPreview artifact={makeArtifact()} onSaveContent={onSaveContent} />);
    await act(async () => {
      screen.getAllByText('Edit')[0]!.click();
    });
    await act(async () => {
      screen.getAllByText('Cancel')[0]!.click();
    });
    expect(onSaveContent).not.toHaveBeenCalled();
  });

  it('triggers artifact refine with the selected instruction', async () => {
    const onRefine = vi.fn();
    render(<ArtifactPreview artifact={makeArtifact()} onRefine={onRefine} />);

    fireEvent.change(screen.getByTestId('artifact-refine-select-artifact-1'), {
      target: { value: 'make_easier' },
    });

    await act(async () => {
      screen.getByTestId('artifact-refine-run-artifact-1').click();
    });

    expect(onRefine).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'artifact-1' }),
      { instruction: 'make_easier' },
    );
  });

  it('renders compact variant', () => {
    const { container } = render(<ArtifactPreview artifact={makeArtifact()} compact={true} />);
    const compactEl = container.querySelector('[data-testid="artifact-preview-artifact-1"]');
    expect(compactEl).toBeTruthy();
  });

  it('renders session provenance when enabled', () => {
    render(
      <ArtifactPreview
        artifact={makeArtifact({ sessionTitle: 'Database Systems / Joins' })}
        showSessionProvenance
      />,
    );

    expect(screen.getByText(/From session:/i)).toBeTruthy();
    expect(screen.getByText('Database Systems / Joins')).toBeTruthy();
  });

  it('does not render session provenance when disabled', () => {
    render(
      <ArtifactPreview
        artifact={makeArtifact({ sessionTitle: 'Database Systems / Joins' })}
      />,
    );

    expect(screen.queryByText(/From session:/i)).toBeFalsy();
  });

  it('shows more cards text only when cards exceed 5', () => {
    const cards: FlashcardCard[] = Array.from({ length: 6 }, (_, i) => ({
      front: `Question ${i + 1}`,
      back: `Answer ${i + 1}`,
    }));
    const artifact = makeArtifact({ type: 'flashcard_set', content: cards });
    render(<ArtifactPreview artifact={artifact} />);
    const moreCards = screen.queryAllByText(/\+1 more cards/);
    expect(moreCards.length).toBe(1);
  });

  it('hides more cards text when exactly 5 flashcards exist', () => {
    const cards: FlashcardCard[] = Array.from({ length: 5 }, (_, i) => ({
      front: `Question ${i + 1}`,
      back: `Answer ${i + 1}`,
    }));
    const artifact = makeArtifact({ type: 'flashcard_set', content: cards });
    render(<ArtifactPreview artifact={artifact} />);
    const moreCards = screen.queryAllByText(/\+.*more cards/);
    expect(moreCards).toHaveLength(0);
  });

  it('hides more questions text when exactly 3 questions exist', () => {
    const questions: QuizQuestion[] = Array.from({ length: 3 }, (_, i) => ({
      question: `Question ${i + 1}`,
      options: ['A', 'B'],
      answer: 0,
    }));
    const artifact = makeArtifact({ type: 'quiz_set', content: questions });
    render(<ArtifactPreview artifact={artifact} />);
    expect(screen.queryByText(/\+.*more questions/)).toBeFalsy();
  });
});

describe('SummaryContentView', () => {
  it('renders copy button for summary artifact', () => {
    const artifact = makeArtifact({
      type: 'summary',
      content: { bullets: ['Bullet one', 'Bullet two'], keyTerms: ['term1'] },
    });
    render(<ArtifactPreview artifact={artifact} />);
    const copyBtn = screen.getByTitle('Copy summary');
    expect(copyBtn).toBeTruthy();
  });

  it('copies bullets to clipboard when copy button is clicked', async () => {
    const artifact = makeArtifact({
      type: 'summary',
      content: { bullets: ['First bullet', 'Second bullet'], keyTerms: [] },
    });
    render(<ArtifactPreview artifact={artifact} />);
    const copyBtn = screen.getByTitle('Copy summary');
    await act(async () => { copyBtn.click(); });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('First bullet\nSecond bullet');
  });

  it('shows "Show more" for summary with more than 3 bullets', () => {
    const artifact = makeArtifact({
      type: 'summary',
      content: {
        bullets: ['Bullet 1', 'Bullet 2', 'Bullet 3', 'Bullet 4', 'Bullet 5'],
        keyTerms: [],
      },
    });
    render(<ArtifactPreview artifact={artifact} />);
    expect(screen.getByText('Show 2 more')).toBeTruthy();
  });

  it('shows only first 3 bullets when collapsed', () => {
    const artifact = makeArtifact({
      type: 'summary',
      content: {
        bullets: ['Bullet 1', 'Bullet 2', 'Bullet 3', 'Bullet 4', 'Bullet 5'],
        keyTerms: [],
      },
    });
    render(<ArtifactPreview artifact={artifact} />);
    expect(screen.getByText('Bullet 1')).toBeTruthy();
    expect(screen.getByText('Bullet 2')).toBeTruthy();
    expect(screen.getByText('Bullet 3')).toBeTruthy();
    expect(screen.queryByText('Bullet 4')).toBeFalsy();
  });

  it('expands to show all bullets when "Show more" is clicked', async () => {
    const artifact = makeArtifact({
      type: 'summary',
      content: {
        bullets: ['Bullet 1', 'Bullet 2', 'Bullet 3', 'Bullet 4', 'Bullet 5'],
        keyTerms: [],
      },
    });
    render(<ArtifactPreview artifact={artifact} />);
    const showMore = screen.getByText('Show 2 more');
    await act(async () => { showMore.click(); });
    expect(screen.getByText('Bullet 4')).toBeTruthy();
    expect(screen.getByText('Bullet 5')).toBeTruthy();
  });

  it('renders key terms after bullets in expanded view', () => {
    const artifact = makeArtifact({
      type: 'summary',
      content: {
        bullets: ['Bullet 1', 'Bullet 2', 'Bullet 3'],
        keyTerms: ['SQL', 'JOIN', 'Database'],
      },
    });
    render(<ArtifactPreview artifact={artifact} />);
    expect(screen.getByText('SQL')).toBeTruthy();
    expect(screen.getByText('JOIN')).toBeTruthy();
    expect(screen.getByText('Database')).toBeTruthy();
  });

  it('hides "Show more" when summary has 3 or fewer bullets', () => {
    const artifact = makeArtifact({
      type: 'summary',
      content: {
        bullets: ['Bullet 1', 'Bullet 2', 'Bullet 3'],
        keyTerms: [],
      },
    });
    render(<ArtifactPreview artifact={artifact} />);
    expect(screen.queryByText(/Show.*more/)).toBeFalsy();
  });
});
