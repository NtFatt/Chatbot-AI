import type { MaterialLevel, MaterialType } from '../constants/ui';
import type { AIFallbackInfo } from './ai-fallback';
import type { AiRuntimeMode } from './ai-runtime';
import type { ProviderKey } from '../constants/providers';

export interface MaterialSubject {
  id: string;
  slug: string;
  nameVi: string;
  nameEn: string;
}

export interface MaterialTopic {
  id: string;
  slug: string;
  nameVi: string;
  nameEn: string;
  subjectId: string;
}

export interface MaterialRecommendation {
  id: string;
  title: string;
  description: string;
  url: string;
  subject: MaterialSubject;
  topic: MaterialTopic | null;
  level: MaterialLevel;
  type: MaterialType;
  tags: string[];
  language: string;
  source: string;
  score: number;
  reason: string[];
  isFeatured: boolean;
}

export interface RetrievalMaterialSource extends Record<string, unknown> {
  id: string;
  title: string;
  url: string;
  snippet: string;
  score: number;
  reason: string[];
  subjectLabel: string;
  topicLabel: string | null;
  type: MaterialType;
  level: MaterialLevel;
}

export interface RetrievalSnapshot extends Record<string, unknown> {
  aiRuntimeMode?: AiRuntimeMode | null;
  executionProvider?: ProviderKey | null;
  executionModel?: string | null;
  learningEngineUsed?: boolean;
  externalFallbackUsed?: boolean;
  inferredSubject?: string | null;
  inferredTopic?: string | null;
  modelVersionId?: string | null;
  queryExpansion: string[];
  materials: RetrievalMaterialSource[];
  fallbackInfo?: AIFallbackInfo | null;
}

export interface MaterialSearchParams {
  q?: string;
  subject?: string;
  topic?: string;
  level?: MaterialLevel;
  type?: MaterialType;
  limit?: number;
}
