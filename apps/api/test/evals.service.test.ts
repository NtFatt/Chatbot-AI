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

  it('benchmarks an active local_lora model version through the model gateway', async () => {
    const repository = {
      findCasesByIds: vi.fn().mockResolvedValue([
        {
          id: 'case-local',
          name: 'Explain OOP',
          description: 'Explain object-oriented programming.',
          category: 'explain_concept',
          inputMessages: [{ role: 'user', content: 'Giải thích OOP.' }],
          idealResponse: 'OOP organizes code around objects and classes.',
          scoringNotes: null,
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
          updatedAt: new Date('2026-05-01T00:00:00.000Z'),
        },
      ]),
      createRun: vi.fn().mockImplementation(async (input) => ({
        id: 'run-local',
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
          id: 'result-local',
          runId: 'run-local',
          evalCaseId: result.evalCaseId,
          output: result.output,
          score: result.score,
          notes: result.notes ?? null,
          createdAt: new Date('2026-05-02T00:00:00.000Z'),
          evalCase: {
            id: 'case-local',
            name: 'Explain OOP',
            description: 'Explain object-oriented programming.',
            category: 'explain_concept',
            inputMessages: [],
            idealResponse: 'OOP organizes code around objects and classes.',
            scoringNotes: null,
            createdAt: new Date('2026-05-01T00:00:00.000Z'),
            updatedAt: new Date('2026-05-01T00:00:00.000Z'),
          },
        })),
      })),
    };
    const modelGateway = {
      generateSingle: vi.fn().mockResolvedValue({
        provider: 'local_lora',
        model: 'local-lora-tutor-v1',
        modelVersionId: 'mv-local',
        text: 'OOP organizes code around classes and objects.',
        finishReason: 'stop',
        latencyMs: 180,
      }),
    };

    const service = new EvalsService(
      repository as never,
      {} as never,
      {
        getVersionById: vi.fn().mockResolvedValue({
          id: 'mv-local',
          name: 'Local LoRA Tutor',
          provider: 'local_lora',
          baseModel: 'local-lora-tutor-v1',
          fineTunedModel: 'local-lora-tutor-v1',
        }),
      } as never,
      modelGateway as never,
    );

    const run = await service.createRun({
      modelVersionId: 'mv-local',
      evalCaseIds: ['case-local'],
    });

    expect(modelGateway.generateSingle).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'local_lora',
        model: 'local-lora-tutor-v1',
        modelVersionId: 'mv-local',
      }),
    );
    expect(run.provider).toBe('local_lora');
    expect(run.modelVersionId).toBe('mv-local');
  });

  it('benchmarks the internal_l3_tutor path without the external model gateway', async () => {
    const repository = {
      findCasesByIds: vi.fn().mockResolvedValue([
        {
          id: 'case-internal',
          name: 'Explain Java inheritance',
          description: 'Explain inheritance simply.',
          category: 'explain_concept',
          inputMessages: [{ role: 'user', content: 'Giải thích kế thừa trong Java.' }],
          idealResponse: 'Inheritance lets a subclass reuse behavior from a parent class.',
          scoringNotes: null,
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
          updatedAt: new Date('2026-05-01T00:00:00.000Z'),
        },
      ]),
      createRun: vi.fn().mockImplementation(async (input) => ({
        id: 'run-internal',
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
          id: 'result-internal',
          runId: 'run-internal',
          evalCaseId: result.evalCaseId,
          output: result.output,
          score: result.score,
          notes: result.notes ?? null,
          createdAt: new Date('2026-05-02T00:00:00.000Z'),
          evalCase: {
            id: 'case-internal',
            name: 'Explain Java inheritance',
            description: 'Explain inheritance simply.',
            category: 'explain_concept',
            inputMessages: [],
            idealResponse: 'Inheritance lets a subclass reuse behavior from a parent class.',
            scoringNotes: null,
            createdAt: new Date('2026-05-01T00:00:00.000Z'),
            updatedAt: new Date('2026-05-01T00:00:00.000Z'),
          },
        })),
      })),
    };
    const internalTutor = {
      generate: vi.fn().mockResolvedValue({
        provider: 'internal_l3_tutor',
        model: 'internal-l3-tutor-v1',
        modelVersionId: 'mv-internal',
        contentMarkdown: 'Inheritance lets a subclass reuse behavior from a parent class.',
        finishReason: 'stop',
        latencyMs: 4,
      }),
    };
    const modelGateway = {
      generateSingle: vi.fn(),
    };

    const service = new EvalsService(
      repository as never,
      {} as never,
      {
        getVersionById: vi.fn().mockResolvedValue({
          id: 'mv-internal',
          name: 'Internal L3 Tutor',
          provider: 'internal_l3_tutor',
          baseModel: 'internal-l3-tutor-v1',
          fineTunedModel: null,
        }),
      } as never,
      modelGateway as never,
      internalTutor as never,
    );

    const run = await service.createRun({
      modelVersionId: 'mv-internal',
      evalCaseIds: ['case-internal'],
    });

    expect(internalTutor.generate).toHaveBeenCalledTimes(1);
    expect(modelGateway.generateSingle).not.toHaveBeenCalled();
    expect(run.provider).toBe('internal_l3_tutor');
    expect(run.modelVersionId).toBe('mv-internal');
  });
});
