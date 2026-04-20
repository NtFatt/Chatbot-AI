import type { AnyZodObject, ZodTypeAny } from 'zod';

import type { Request, Response } from 'express';

import { failure } from '../utils/api-response';

type Source = 'body' | 'query' | 'params';

export const validate = <Schema extends AnyZodObject | ZodTypeAny>(schema: Schema, source: Source) => {
  return (req: Request, res: Response, next: () => void) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      return failure(req, res, 400, 'VALIDATION_ERROR', 'Invalid request payload.', parsed.error.flatten());
    }

    req.validated = {
      ...req.validated,
      [source]: parsed.data,
    };

    if (source === 'body' || source === 'params') {
      req[source] = parsed.data as Request[Source];
    }

    return next();
  };
};
