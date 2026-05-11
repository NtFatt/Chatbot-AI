import { describe, expect, it, vi } from 'vitest';

import { EvalsService } from '../src/modules/evals/evals.service';

describe('EvalsService', () => {
  it('creates a benchmark run with heuristic scores from the model gateway', async () => {
    const repository = {
      findCasesByIds: vi.fn().mockResolvedValue([
        {
          id: 'case-1',
          name: 'Explain SQL joins',
          description: 'Explain joins clearly.',
          category: 'explain_concept',
          inputMessages: [{ role: 'user', content: 'Explain SQL joins.' }],
          idealResponse: 'A join combines rows from multiple tables.',
          scoringNotes: null,
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
          updatedAt: new Date('2026-05-01T00:00:00.000Z'),
        },
      ]),
      createRun: vi.fn().mockImplementation(async (input) => ({
        id: 'run-1',
        provider: input.provider,
        model: input.model,
        modelVersionId: input.modelVersionId ?? null,
        averageScore: input.averageScore,
        notes: input.notes ?? null,
        createdAt: new Date('2026-05-02T00:00:00.000Z'),
        updatedAt: new Date('2026-05-02T00:00:00.000Z'),
        results: input.results.map((result: {
          evalCaseId: string;
          output: string;
          score: number;
          notes?: string | null;
        }) => ({
          id: 'result-1',
          runId: 'run-1',
          evalCaseId: result.evalCaseId,
          output: result.output,
          score: result.score,
          notes: result.notes ?? null,
          createdAt: new Date('2026-05-02T00:00:00.000Z'),
          evalCase: {
            id: 'case-1',
            name: 'Explain SQL joins',
            description: 'Explain joins clearly.',
            category: 'explain_concept',
            inputMessages: [],
            idealResponse: 'A join combines rows from multiple tables.',
            scoringNotes: null,
            createdAt: new Date('2026-05-01T00:00:00.000Z'),
            updatedAt: new Date('2026-05-01T00:00:00.000Z'),
          },
        })),
      })),
    };

    const service = new EvalsService(
      repository as never,
      {
        listProviders: vi.fn().mockResolvedValue({
          defaultProvider: 'OPENAI',
          fallbackProvider: 'GEMINI',
          providers: [
            {
              key: 'OPENAI',
              model: 'gpt-5.4-mini',
              modelVersionId: 'model-version-1',
            },
          ],
        }),
      } as never,
      {} as never,
      {
        generateSingle: vi.fn().mockResolvedValue({
          provider: 'OPENAI',
          model: 'gpt-5.4-mini',
          modelVersionId: 'model-version-1',
          text: 'A join combines rows from multiple tables using related columns.',
          finishReason: 'stop',
          latencyMs: 220,
        }),
      } as never,
    );

    const run = await service.createRun({
      provider: 'OPENAI',
      model: 'gpt-5.4-mini',
      evalCaseIds: ['case-1'],
    });

    expect(run.averageScore).toBeGreaterThan(0.5);
    expect(run.results[0]?.score).toBeGreaterThan(0.5);
  });
});
