import 'dotenv/config';

import { z } from 'zod';

const booleanish = z
  .string()
  .optional()
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1000).max(65535).default(4000),
  DATABASE_URL: z.string().min(1),
  CLIENT_ORIGIN: z
    .string()
    .default(
      'http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174',
    ),
  JWT_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().min(5).default(30),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).default(30),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  GEMINI_ENABLED: booleanish.default('true'),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().min(5000).default(25000),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-5.4-mini'),
  OPENAI_ENABLED: booleanish.default('true'),
  OPENAI_TIMEOUT_MS: z.coerce.number().int().min(5000).default(25000),
  AI_MAX_CONTEXT_MESSAGES: z.coerce.number().int().min(4).max(30).default(10),
  AI_MAX_PROMPT_CHARS: z.coerce.number().int().min(1000).default(12000),
  AI_REQUEST_RETRY_COUNT: z.coerce.number().int().min(0).max(3).default(1),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = {
  ...parsed.data,
  clientOrigins: parsed.data.CLIENT_ORIGIN.split(',').map((origin) => origin.trim()),
};
