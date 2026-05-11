import { describe, expect, it } from 'vitest';

import { AppError, isAppError } from '../src/utils/errors';

describe('errors', () => {
  describe('AppError', () => {
    it('creates an error with status code, code, and message', () => {
      const error = new AppError(404, 'NOT_FOUND', 'Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Resource not found');
      expect(error.name).toBe('AppError');
    });

    it('stores optional details', () => {
      const error = new AppError(422, 'VALIDATION_FAILED', 'Invalid input', { field: 'email' });
      expect(error.details).toEqual({ field: 'email' });
    });

    it('is an instance of Error', () => {
      const error = new AppError(500, 'INTERNAL', 'Server error');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('isAppError', () => {
    it('returns true for AppError instances', () => {
      const error = new AppError(400, 'BAD_REQUEST', 'Bad request');
      expect(isAppError(error)).toBe(true);
    });

    it('returns false for plain Error instances', () => {
      const error = new Error('Something went wrong');
      expect(isAppError(error)).toBe(false);
    });

    it('returns false for null and undefined', () => {
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
    });

    it('returns false for non-object values', () => {
      expect(isAppError('error string')).toBe(false);
      expect(isAppError(42)).toBe(false);
    });
  });
});
