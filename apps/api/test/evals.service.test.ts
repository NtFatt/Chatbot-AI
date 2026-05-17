import { describe, expect, it, vi } from 'vitest';

import { env } from '../src/config/env';
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
          inputMessages: [{ role: 'user', content: 'Giải thích SQL JOIN ngắn gọn bằng tiếng Việt.' }],
          idealResponse:
            'SQL JOIN là cách ghép dữ liệu từ nhiều bảng dựa trên cột liên quan. Ví dụ có bảng students và classes. Lỗi hay gặp là nhầm JOIN với UNION. Câu hỏi tự luyện: Khi nào nên dùng LEFT JOIN?',
          scoringNotes: JSON.stringify({
            maxResponseChars: 360,
            expectedKeyPoints: ['JOIN', 'ghép dữ liệu', 'ví dụ', 'lỗi hay gặp', 'câu hỏi tự luyện'],
          }),
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
            idealResponse:
              'SQL JOIN là cách ghép dữ liệu từ nhiều bảng dựa trên cột liên quan. Ví dụ có bảng students và classes. Lỗi hay gặp là nhầm JOIN với UNION. Câu hỏi tự luyện: Khi nào nên dùng LEFT JOIN?',
            scoringNotes: JSON.stringify({
              maxResponseChars: 360,
              expectedKeyPoints: ['JOIN', 'ghép dữ liệu', 'ví dụ', 'lỗi hay gặp', 'câu hỏi tự luyện'],
            }),
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
          text: [
            '- SQL JOIN là cách ghép dữ liệu từ nhiều bảng dựa trên cột liên quan.',
            '- Ví dụ: ghép bảng `students` với `classes` qua `class_id` để biết mỗi học sinh thuộc lớp nào.',
            '- Lỗi hay gặp: nhầm JOIN với UNION vì JOIN ghép theo quan hệ còn UNION nối các dòng cùng cấu trúc.',
            '- Câu hỏi tự luyện: Khi nào em nên dùng LEFT JOIN thay vì INNER JOIN?',
          ].join('\n'),
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
        maxNewTokens: env.LOCAL_LORA_MAX_NEW_TOKENS,
        contextMaxChars: env.LOCAL_LORA_CONTEXT_MAX_CHARS,
      }),
    );
    expect(run.provider).toBe('local_lora');
    expect(run.modelVersionId).toBe('mv-local');
  });

  it('records latency summary notes with p50 and p95 values', async () => {
    const repository = {
      findCasesByIds: vi.fn().mockResolvedValue([
        {
          id: 'case-summary-1',
          name: 'Case 1',
          description: 'Desc',
          category: 'explain_concept',
          inputMessages: [{ role: 'user', content: 'Giải thích OOP.' }],
          idealResponse: 'OOP là gì đó.',
          scoringNotes: null,
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
          updatedAt: new Date('2026-05-01T00:00:00.000Z'),
        },
        {
          id: 'case-summary-2',
          name: 'Case 2',
          description: 'Desc',
          category: 'explain_concept',
          inputMessages: [{ role: 'user', content: 'Giải thích lớp.' }],
          idealResponse: 'Lớp là gì đó.',
          scoringNotes: null,
          createdAt: new Date('2026-05-01T00:00:00.000Z'),
          updatedAt: new Date('2026-05-01T00:00:00.000Z'),
        },
      ]),
      createRun: vi.fn().mockImplementation(async (input) => ({
        id: 'run-summary',
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
        }, index: number) => ({
          id: `result-${index}`,
          runId: 'run-summary',
          evalCaseId: result.evalCaseId,
          output: result.output,
          score: result.score,
          notes: result.notes ?? null,
          createdAt: new Date('2026-05-02T00:00:00.000Z'),
          evalCase: {
            id: result.evalCaseId,
            name: `Case ${index + 1}`,
            description: 'Desc',
            category: 'explain_concept',
            inputMessages: [],
            idealResponse: 'Ref',
            scoringNotes: null,
            createdAt: new Date('2026-05-01T00:00:00.000Z'),
            updatedAt: new Date('2026-05-01T00:00:00.000Z'),
          },
        })),
      })),
    };
    const modelGateway = {
      generateSingle: vi
        .fn()
        .mockResolvedValueOnce({
          provider: 'local_lora',
          model: 'local-lora-tutor-v3',
          modelVersionId: 'mv-local-v3',
          text: 'Trả lời 1',
          finishReason: 'stop',
          latencyMs: 120,
        })
        .mockResolvedValueOnce({
          provider: 'local_lora',
          model: 'local-lora-tutor-v3',
          modelVersionId: 'mv-local-v3',
          text: 'Trả lời 2',
          finishReason: 'stop',
          latencyMs: 420,
        }),
    };

    const service = new EvalsService(
      repository as never,
      {} as never,
      {
        listActiveVersions: vi.fn().mockResolvedValue([
          {
            id: 'mv-local-v3',
            provider: 'local_lora',
            baseModel: 'HuggingFaceTB/SmolLM2-135M-Instruct',
            fineTunedModel: 'local-lora-tutor-v3',
          },
        ]),
      } as never,
      modelGateway as never,
    );

    const run = await service.createRun({
      provider: 'local_lora',
      evalCaseIds: ['case-summary-1', 'case-summary-2'],
    });

    expect(run.notes).toContain('avgLatencyMs=270');
    expect(run.notes).toContain('p50LatencyMs=120');
    expect(run.notes).toContain('p95LatencyMs=420');
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
