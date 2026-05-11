import { beforeEach, describe, expect, it } from 'vitest';

import { ChatGuardService } from '../src/modules/chat/chat-guard.service';
import { AppError } from '../src/utils/errors';

describe('ChatGuardService', () => {
  let service: ChatGuardService;

  beforeEach(() => {
    service = new ChatGuardService();
  });

  describe('normalizeMessage', () => {
    it('strips null bytes', () => {
      const result = service.normalizeMessage('Hello\u0000World');
      expect(result).toBe('HelloWorld');
    });

    it('trims leading and trailing whitespace', () => {
      const result = service.normalizeMessage('  Hello World  ');
      expect(result).toBe('Hello World');
    });

    it('collapses multiple whitespace-newline sequences', () => {
      const result = service.normalizeMessage('Line1\n\n\nLine2');
      expect(result).toBe('Line1\nLine2');
    });

    it('throws EMPTY_MESSAGE for empty input', () => {
      try {
        service.normalizeMessage('');
        expect.fail('should have thrown');
      } catch (err) {
        const error = err as AppError;
        expect(error.code).toBe('EMPTY_MESSAGE');
      }
    });

    it('throws EMPTY_MESSAGE for whitespace-only input', () => {
      try {
        service.normalizeMessage('  \u0000  ');
        expect.fail('should have thrown');
      } catch (err) {
        const error = err as AppError;
        expect(error.code).toBe('EMPTY_MESSAGE');
      }
    });

    it('throws MESSAGE_TOO_LONG for messages exceeding MAX_MESSAGE_CHARS', () => {
      const longMessage = 'a'.repeat(5001);
      try {
        service.normalizeMessage(longMessage);
        expect.fail('should have thrown');
      } catch (err) {
        const error = err as AppError;
        expect(error.code).toBe('MESSAGE_TOO_LONG');
      }
    });

    it('accepts a short message', () => {
      const result = service.normalizeMessage('Hello world');
      expect(result).toBe('Hello world');
    });
  });

  describe('assertCanAsk', () => {
    it('allows the first message', () => {
      const result = service.assertCanAsk('user-1', 'Hello world');
      expect(result).toBe('Hello world');
    });

    it('allows messages up to the per-window limit', () => {
      for (let i = 0; i < 12; i += 1) {
        service.assertCanAsk('user-1', `Message ${i}`);
      }
      expect(() => service.assertCanAsk('user-1', 'Message 12')).toThrow(AppError);
    });

    it('enforces rate limits per user', () => {
      for (let i = 0; i < 12; i += 1) {
        service.assertCanAsk('user-1', `User1 message ${i}`);
      }
      expect(() => service.assertCanAsk('user-1', 'Message 12')).toThrow(AppError);
      const result = service.assertCanAsk('user-2', 'User2 first message');
      expect(result).toBe('User2 first message');
    });

    it('allows up to MAX_CONCURRENT_STREAMS streams per user', () => {
      service.beginStream('user-1');
      service.assertCanAsk('user-1', 'Message 1');
      service.beginStream('user-1');
      expect(() => service.assertCanAsk('user-1', 'Message 2')).toThrow(AppError);
    });
  });

  describe('assertCanRetry', () => {
    it('allows the first retry', () => {
      const result = service.assertCanRetry('user-1', 'Retry message');
      expect(result).toBe('Retry message');
    });

    it('allows retries up to the per-window limit', () => {
      for (let i = 0; i < 6; i += 1) {
        service.assertCanRetry('user-1', `Retry ${i}`);
      }
      expect(() => service.assertCanRetry('user-1', 'Retry 6')).toThrow(AppError);
    });

    it('enforces retry limits per user', () => {
      for (let i = 0; i < 6; i += 1) {
        service.assertCanRetry('user-1', `User1 retry ${i}`);
      }
      expect(() => service.assertCanRetry('user-1', 'User1 retry 6')).toThrow(AppError);
      const result = service.assertCanRetry('user-2', 'User2 first retry');
      expect(result).toBe('User2 first retry');
    });
  });
});
