import { z } from 'zod';

import { MATERIAL_LEVELS, MATERIAL_TYPES } from '../constants/ui';

export const materialSearchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  subject: z.string().trim().max(120).optional(),
  topic: z.string().trim().max(120).optional(),
  level: z.enum(MATERIAL_LEVELS).optional(),
  type: z.enum(MATERIAL_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(24).default(8),
});
