import type { MaterialLevel, MaterialType } from '../constants/ui';

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

export interface MaterialSearchParams {
  q?: string;
  subject?: string;
  topic?: string;
  level?: MaterialLevel;
  type?: MaterialType;
  limit?: number;
}
