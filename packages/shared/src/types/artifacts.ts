export type ArtifactType = 'summary' | 'flashcard_set' | 'quiz_set' | 'note';
export type ArtifactRefineInstruction =
  | 'make_easier'
  | 'make_harder'
  | 'add_examples'
  | 'shorten'
  | 'expand'
  | 'fix_accuracy'
  | 'custom';
export type ReviewSelfAssessment = 'again' | 'hard' | 'good' | 'easy';

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

export interface ArtifactContentUpdateInput {
  content: ArtifactContent;
}

export interface ArtifactRefineInput {
  instruction: ArtifactRefineInstruction;
  customInstruction?: string;
}

export interface ArtifactReviewEventInput {
  itemIndex?: number;
  selfAssessment: ReviewSelfAssessment;
}

export interface StudyArtifact {
  id: string;
  userId: string;
  sessionId: string | null;
  sessionTitle?: string | null;
  messageId: string | null;
  type: ArtifactType;
  title: string;
  content: ArtifactContent;
  isFavorited: boolean;
  isShared?: boolean;
  qualityScore: number | null;
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

export interface ArtifactSearchResult {
  id: string;
  type: ArtifactType;
  title: string;
  sessionId: string | null;
  sessionTitle: string | null;
  preview: string;
  isFavorited: boolean;
  createdAt: string;
}

export interface ArtifactExportPayload {
  artifactId: string;
  filename: string;
  mimeType: 'text/markdown';
  markdown: string;
}

export interface ArtifactSharePayload {
  artifactId: string;
  isShared: true;
  shareToken: string;
}

export interface ArtifactShareRevokePayload {
  artifactId: string;
  isShared: false;
}

export interface PublicStudyArtifact {
  id: string;
  type: ArtifactType;
  title: string;
  content: ArtifactContent;
  qualityScore: number | null;
  createdAt: string;
}

export interface ReviewHistory {
  id: string;
  userId: string;
  artifactId: string;
  itemIndex: number;
  selfAssessment: ReviewSelfAssessment;
  reviewedAt: string;
}
