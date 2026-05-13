import { z } from 'zod';

import { AI_RUNTIME_MODES } from '../types/ai-runtime';

export const aiRuntimeModeSchema = z.enum(AI_RUNTIME_MODES);
