import type { ApiErrorEnvelope, ApiSuccessEnvelope } from '@chatbot-ai/shared';
import type { Request, Response } from 'express';

export const success = <T>(
  req: Request,
  res: Response<ApiSuccessEnvelope<T>>,
  data: T,
  statusCode = 200,
) => {
  return res.status(statusCode).json({
    success: true,
    data,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  });
};

export const failure = (
  req: Request,
  res: Response<ApiErrorEnvelope>,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  });
};
