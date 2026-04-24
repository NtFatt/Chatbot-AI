import { MAX_MESSAGE_CHARS } from '@chatbot-ai/shared';

import { AppError } from '../../utils/errors';
import { sanitizeInput } from '../../utils/text';

const WINDOW_MS = 60_000;
const MAX_MESSAGES_PER_WINDOW = 12;
const MAX_RETRIES_PER_WINDOW = 6;
const MAX_CONCURRENT_STREAMS = 2;

interface UserRuntime {
  asks: number[];
  retries: number[];
  concurrentStreams: number;
}

export class ChatGuardService {
  private readonly runtime = new Map<string, UserRuntime>();

  private getRuntime(userId: string) {
    const existing = this.runtime.get(userId);
    if (existing) {
      return existing;
    }

    const next: UserRuntime = {
      asks: [],
      retries: [],
      concurrentStreams: 0,
    };
    this.runtime.set(userId, next);
    return next;
  }

  private prune(runtime: UserRuntime) {
    const threshold = Date.now() - WINDOW_MS;
    runtime.asks = runtime.asks.filter((timestamp) => timestamp >= threshold);
    runtime.retries = runtime.retries.filter((timestamp) => timestamp >= threshold);
  }

  normalizeMessage(message: string) {
    const sanitized = sanitizeInput(message).replace(/\s+\n/g, '\n').trim();
    if (!sanitized) {
      throw new AppError(400, 'EMPTY_MESSAGE', 'Vui lòng nhập câu hỏi trước khi gửi.');
    }

    if (sanitized.length > MAX_MESSAGE_CHARS) {
      throw new AppError(400, 'MESSAGE_TOO_LONG', 'Câu hỏi đang quá dài cho một lượt hỏi hiện tại.');
    }

    return sanitized;
  }

  assertCanAsk(userId: string, message: string) {
    const runtime = this.getRuntime(userId);
    this.prune(runtime);

    const normalized = this.normalizeMessage(message);
    if (runtime.asks.length >= MAX_MESSAGES_PER_WINDOW) {
      throw new AppError(429, 'CHAT_RATE_LIMITED', 'Bạn đang gửi câu hỏi quá nhanh. Hãy chờ một chút rồi thử lại.');
    }

    if (runtime.concurrentStreams >= MAX_CONCURRENT_STREAMS) {
      throw new AppError(429, 'TOO_MANY_STREAMS', 'Bạn đang có quá nhiều câu hỏi đang chờ phản hồi cùng lúc.');
    }

    runtime.asks.push(Date.now());
    return normalized;
  }

  assertCanRetry(userId: string, message: string) {
    const runtime = this.getRuntime(userId);
    this.prune(runtime);

    const normalized = this.normalizeMessage(message);
    if (runtime.retries.length >= MAX_RETRIES_PER_WINDOW) {
      throw new AppError(429, 'RETRY_RATE_LIMITED', 'Bạn đang thử gửi lại quá nhiều lần. Hãy chờ một lát rồi thử lại.');
    }

    runtime.retries.push(Date.now());
    return normalized;
  }

  beginStream(userId: string) {
    const runtime = this.getRuntime(userId);
    runtime.concurrentStreams += 1;

    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      runtime.concurrentStreams = Math.max(0, runtime.concurrentStreams - 1);
    };
  }
}
