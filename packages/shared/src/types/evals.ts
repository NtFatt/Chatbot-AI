import type { ProviderKey } from '../constants/providers';
import type { TrainingMessage } from './training';

export type EvalCategory =
  | 'explain_concept'
  | 'give_example'
  | 'compare_concepts'
  | 'socratic_hint'
  | 'grade_answer'
  | 'correct_student_answer'
  | 'generate_quiz'
  | 'generate_flashcards'
  | 'summarize_lesson'
  | 'study_plan'
  | 'source_grounded_answer'
  | 'fallback_transparency';

export interface EvalCase {
  id: string;
  name: string;
  description: string | null;
  category: EvalCategory;
  inputMessages: TrainingMessage[];
  idealResponse: string | null;
  scoringNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EvalRunResult {
  id: string;
  runId: string;
  evalCaseId: string;
  evalCaseName: string;
  category: EvalCategory;
  output: string;
  score: number;
  notes: string | null;
  createdAt: string;
}

export interface EvalRun {
  id: string;
  provider: ProviderKey;
  model: string;
  modelVersionId: string | null;
  averageScore: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  results: EvalRunResult[];
}

export interface CreateEvalCaseInput {
  name: string;
  description?: string;
  category: EvalCategory;
  inputMessages: TrainingMessage[];
  idealResponse?: string;
  scoringNotes?: string;
}

export interface UpdateEvalCaseInput {
  name?: string;
  description?: string | null;
  category?: EvalCategory;
  inputMessages?: TrainingMessage[];
  idealResponse?: string | null;
  scoringNotes?: string | null;
}

export interface CreateEvalRunInput {
  provider?: ProviderKey;
  model?: string;
  modelVersionId?: string;
  evalCaseIds?: string[];
  notes?: string;
}
