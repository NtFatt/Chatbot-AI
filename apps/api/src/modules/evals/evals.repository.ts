import type { ProviderKey } from '@chatbot-ai/shared';
import type { PrismaClient } from '@prisma/client';

import { prisma } from '../../config/prisma';

type DatabaseClient = Pick<PrismaClient, 'evalCase' | 'evalRun'>;

export class EvalsRepository {
  constructor(private readonly db: DatabaseClient = prisma) {}

  listCases() {
    return this.db.evalCase.findMany({
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  createCase(input: {
    name: string;
    description?: string | null;
    category:
      | 'explain_concept'
      | 'socratic_hint'
      | 'grade_answer'
      | 'generate_quiz'
      | 'summarize_lesson'
      | 'source_grounded_answer'
      | 'fallback_transparency';
    inputMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    idealResponse?: string | null;
    scoringNotes?: string | null;
  }) {
    return this.db.evalCase.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        category: input.category,
        inputMessages: JSON.parse(JSON.stringify(input.inputMessages)),
        idealResponse: input.idealResponse ?? null,
        scoringNotes: input.scoringNotes ?? null,
      },
    });
  }

  findCaseById(id: string) {
    return this.db.evalCase.findUnique({
      where: { id },
    });
  }

  findCasesByIds(ids?: string[]) {
    return this.db.evalCase.findMany({
      where: ids && ids.length > 0 ? { id: { in: ids } } : undefined,
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  updateCase(id: string, input: {
    name?: string;
    description?: string | null;
    category?:
      | 'explain_concept'
      | 'socratic_hint'
      | 'grade_answer'
      | 'generate_quiz'
      | 'summarize_lesson'
      | 'source_grounded_answer'
      | 'fallback_transparency';
    inputMessages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    idealResponse?: string | null;
    scoringNotes?: string | null;
  }) {
    return this.db.evalCase.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        category: input.category,
        inputMessages: input.inputMessages
          ? JSON.parse(JSON.stringify(input.inputMessages))
          : undefined,
        idealResponse: input.idealResponse,
        scoringNotes: input.scoringNotes,
      },
    });
  }

  deleteCase(id: string) {
    return this.db.evalCase.delete({
      where: { id },
    });
  }

  listRuns() {
    return this.db.evalRun.findMany({
      orderBy: [{ createdAt: 'desc' }],
      include: {
        results: {
          include: {
            evalCase: true,
          },
          orderBy: [{ createdAt: 'asc' }],
        },
      },
    });
  }

  createRun(input: {
    provider: ProviderKey;
    model: string;
    modelVersionId?: string | null;
    averageScore: number | null;
    notes?: string | null;
    results: Array<{
      evalCaseId: string;
      output: string;
      score: number;
      notes?: string | null;
    }>;
  }) {
    return this.db.evalRun.create({
      data: {
        provider: input.provider,
        model: input.model,
        modelVersionId: input.modelVersionId ?? null,
        averageScore: input.averageScore,
        notes: input.notes ?? null,
        results: {
          create: input.results.map((result) => ({
            evalCaseId: result.evalCaseId,
            output: result.output,
            score: result.score,
            notes: result.notes ?? null,
          })),
        },
      },
      include: {
        results: {
          include: {
            evalCase: true,
          },
          orderBy: [{ createdAt: 'asc' }],
        },
      },
    });
  }
}
