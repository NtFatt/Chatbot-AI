import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QuizReviewMode } from '../src/components/chat/artifact-preview/QuizReviewMode';
import type { QuizQuestion, StudyArtifact } from '@chatbot-ai/shared';

afterEach(() => {
  cleanup();
});

const NOW = new Date().toISOString();

const makeQuizArtifact = (): StudyArtifact => ({
  id: 'artifact-quiz',
  userId: 'user-1',
  sessionId: 'session-1',
  sessionTitle: 'Databases',
  messageId: 'message-1',
  type: 'quiz_set',
  title: 'SQL Quiz',
  isFavorited: false,
  qualityScore: null,
  content: [
    {
      question: 'Which join keeps all rows from the left table?',
      options: ['Inner join', 'Left join', 'Cross join', 'Self join'],
      answer: 1,
      explanation: 'Left join retains all rows from the left side.',
    },
    {
      question: 'Which structure improves lookup speed?',
      options: ['Trigger', 'Cursor', 'Index', 'View'],
      answer: 2,
    },
    {
      question: 'Which key uniquely identifies each row?',
      options: ['Foreign key', 'Primary key', 'Composite key', 'Candidate key'],
      answer: 1,
    },
    {
      question: 'Which clause groups rows?',
      options: ['ORDER BY', 'WHERE', 'GROUP BY', 'LIMIT'],
      answer: 2,
    },
  ] satisfies QuizQuestion[],
  createdAt: NOW,
  updatedAt: NOW,
});

describe('QuizReviewMode', () => {
  it('records a review assessment after revealing the answer', async () => {
    const onRecordReviewEvent = vi.fn().mockResolvedValue(undefined);

    render(
      <QuizReviewMode
        artifact={makeQuizArtifact()}
        onBack={vi.fn()}
        onRecordReviewEvent={onRecordReviewEvent}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Reveal answer'));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('quiz-review-mark-good'));
    });

    expect(onRecordReviewEvent).toHaveBeenCalledWith({
      artifact: expect.objectContaining({ id: 'artifact-quiz' }),
      itemIndex: 0,
      selfAssessment: 'good',
    });
    expect(screen.getByText('Saved: good')).toBeTruthy();
  });
});
