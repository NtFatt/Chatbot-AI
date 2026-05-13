/**
 * AI Runtime Mode types for per-session runtime switching.
 *
 * - external_api: Use configured large AI providers directly (Gemini/OpenAI).
 * - learning_engine_l3: Use the Level 3 Learning Engine path — defaulting to
 *   the app's internal tutor model with retrieval/material context, study
 *   policy, model registry, dataset/eval traceability, and optional external
 *   fallback only when explicitly enabled.
 *
 * Important: Level 3 is NOT a fully self-trained AI model.
 * It is a fine-tune-ready AI learning platform mode.
 * Level 4 (actual fine-tuned/local model running as active model) is future.
 */

export const AI_RUNTIME_MODES = ['external_api', 'learning_engine_l3'] as const;

export type AiRuntimeMode = (typeof AI_RUNTIME_MODES)[number];

export const DEFAULT_AI_RUNTIME_MODE: AiRuntimeMode = 'external_api';

export const AI_RUNTIME_MODE_LABELS: Record<
  AiRuntimeMode,
  { en: string; vi: string; description: string }
> = {
  external_api: {
    en: 'External AI API',
    vi: 'API AI lớn',
    description: 'Dùng Gemini/OpenAI trực tiếp qua provider của hệ thống.',
  },
  learning_engine_l3: {
    en: 'Level 3 Learning Engine',
    vi: 'AI học tập Level 3',
    description:
      'Dùng model nội bộ Level 3 của app: tutor policy, tài liệu truy xuất, dataset, evaluation, model registry và pipeline fine-tune-ready.',
  },
};
