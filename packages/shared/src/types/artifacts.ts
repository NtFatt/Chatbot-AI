export type ArtifactType = 'summary' | 'flashcard_set' | 'quiz_set' | 'note';

export interface FlashcardCard {
  front: string;
  back: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
}

export interface SummaryContent {
  bullets: string[];
  keyTerms?: string[];
}

export interface NoteContent {
  body: string;
  tags?: string[];
}

export type ArtifactContent = FlashcardCard[] | QuizQuestion[] | SummaryContent | NoteContent;

export interface StudyArtifact {
  id: string;
  userId: string;
  sessionId: string | null;
  messageId: string | null;
  type: ArtifactType;
  title: string;
  content: ArtifactContent;
  createdAt: string;
  updatedAt: string;
}

export type ArtifactGenerateType = 'summary' | 'flashcard_set' | 'quiz_set' | 'note';

export interface GenerateArtifactParams {
  sessionId?: string;
  messageId?: string;
  type: ArtifactGenerateType;
  sourceContent: string;
}

export interface GenerateArtifactResult {
  artifact: StudyArtifact;
}
