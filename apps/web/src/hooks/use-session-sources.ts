import { useMemo } from 'react';

import type { ChatMessage, RetrievalMaterialSource } from '@chatbot-ai/shared';

export interface AggregatedSource extends RetrievalMaterialSource {
  usageCount: number;
  lastUsedAt: string | null;
}

export interface SessionSourcesResult {
  materials: AggregatedSource[];
  totalUnique: number;
  mostUsed: AggregatedSource | null;
}

export const useSessionSources = (messages: ChatMessage[]): SessionSourcesResult => {
  return useMemo(() => {
    const map = new Map<string, AggregatedSource>();

    for (const message of messages) {
      if (message.senderType !== 'assistant') {
        continue;
      }

      const snapshot = message.retrievalSnapshot;
      if (!snapshot?.materials.length) {
        continue;
      }

      const messageTime = message.createdAt;

      for (const material of snapshot.materials) {
        const existing = map.get(material.id);

        if (existing) {
          existing.usageCount += 1;
          if (!existing.lastUsedAt || messageTime > existing.lastUsedAt) {
            existing.lastUsedAt = messageTime;
          }
        } else {
          map.set(material.id, {
            ...material,
            usageCount: 1,
            lastUsedAt: messageTime,
          });
        }
      }
    }

    const materials = Array.from(map.values()).sort((a, b) => {
      if (b.usageCount !== a.usageCount) {
        return b.usageCount - a.usageCount;
      }
      if (a.lastUsedAt && b.lastUsedAt) {
        return b.lastUsedAt.localeCompare(a.lastUsedAt);
      }
      return 0;
    });

    return {
      materials,
      totalUnique: materials.length,
      mostUsed: materials[0] ?? null,
    };
  }, [messages]);
};
