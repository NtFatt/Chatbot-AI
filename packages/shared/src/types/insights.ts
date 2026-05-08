import type { MaterialLevel } from '../constants/ui';
import type { ArtifactType } from './artifacts';
import type { ChatSessionSummary } from './chat';

export interface InsightCountItem {
  label: string;
  count: number;
}

export interface ArtifactInsightCountItem {
  type: ArtifactType;
  count: number;
}

export interface LevelInsightCountItem {
  level: MaterialLevel;
  count: number;
}

export interface LearningInsightsResponse {
  summary: {
    totalSessions: number;
    activeSessionsLast7Days: number;
    totalArtifacts: number;
    favoriteArtifacts: number;
    lastActivityAt: string | null;
  };
  artifactBreakdown: ArtifactInsightCountItem[];
  topSubjects: InsightCountItem[];
  topTopics: InsightCountItem[];
  topLevels: LevelInsightCountItem[];
  recentSessions: ChatSessionSummary[];
}
