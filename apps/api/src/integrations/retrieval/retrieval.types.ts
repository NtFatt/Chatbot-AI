import type { RetrievalSnapshot } from '@chatbot-ai/shared';

export interface RetrievalContext extends RetrievalSnapshot, Record<string, unknown> {
  promptContext: string;
}
