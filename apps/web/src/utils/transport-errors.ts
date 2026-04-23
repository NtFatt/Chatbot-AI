import type { ApiErrorEnvelope, SocketAck } from '@chatbot-ai/shared';

type TransportErrorKind = 'api' | 'socket';

export class ApiClientError extends Error {
  readonly kind = 'api' as const;

  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly requestId?: string,
    public readonly details?: unknown,
    public readonly timestamp?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class SocketTransportError extends Error {
  readonly kind = 'socket' as const;

  constructor(
    message: string,
    public readonly code: string,
    public readonly requestId: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'SocketTransportError';
  }
}

export interface TransportErrorInfo {
  kind: TransportErrorKind;
  message: string;
  description?: string;
  code?: string;
  requestId?: string;
  status?: number;
  details?: unknown;
}

const requestSummary = (requestId?: string, code?: string) => {
  const parts = [
    code ? `Mã lỗi: ${code}` : null,
    requestId ? `Request: ${requestId}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : undefined;
};

const statusDescription = (status?: number) => {
  if (status === 401) {
    return 'Phiên đăng nhập có thể đã hết hạn. Hệ thống sẽ thử làm mới phiên trước khi yêu cầu lại.';
  }

  if (status === 403) {
    return 'Bạn không có quyền thực hiện thao tác này với phiên học hiện tại.';
  }

  if (status === 409) {
    return 'Dữ liệu vừa thay đổi ở nơi khác. Hãy tải lại để đồng bộ trạng thái mới nhất.';
  }

  if (status === 429) {
    return 'Hệ thống đang nhận quá nhiều yêu cầu. Vui lòng chờ vài giây rồi thử lại.';
  }

  if (status && status >= 500) {
    return 'Máy chủ đang gặp sự cố tạm thời. Bạn có thể thử lại sau ít phút.';
  }

  return undefined;
};

export const createApiClientError = (
  response: Response,
  envelope?: ApiErrorEnvelope,
  fallbackMessage = 'Yêu cầu chưa thể hoàn tất.',
) =>
  new ApiClientError(
    envelope?.error.message || response.statusText || fallbackMessage,
    response.status,
    envelope?.error.code || `HTTP_${response.status}`,
    envelope?.requestId,
    envelope?.error.details,
    envelope?.timestamp,
  );

export const createSocketTransportError = (
  ack: SocketAck,
  fallbackMessage = 'Không thể hoàn tất thao tác qua kết nối realtime.',
) =>
  new SocketTransportError(
    ack.error?.message || fallbackMessage,
    ack.error?.code || 'SOCKET_ACK_FAILED',
    ack.requestId,
    ack.error?.details,
  );

export const isApiClientError = (error: unknown): error is ApiClientError => error instanceof ApiClientError;

export const isSocketTransportError = (error: unknown): error is SocketTransportError =>
  error instanceof SocketTransportError;

export const getTransportErrorInfo = (
  error: unknown,
  fallbackMessage = 'Đã xảy ra lỗi không mong muốn.',
): TransportErrorInfo => {
  if (isApiClientError(error)) {
    return {
      kind: 'api',
      message: error.message,
      description: requestSummary(error.requestId, error.code) ?? statusDescription(error.status),
      code: error.code,
      requestId: error.requestId,
      status: error.status,
      details: error.details,
    };
  }

  if (isSocketTransportError(error)) {
    return {
      kind: 'socket',
      message: error.message,
      description: requestSummary(error.requestId, error.code),
      code: error.code,
      requestId: error.requestId,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    return {
      kind: 'api',
      message: error.message || fallbackMessage,
      description: undefined,
    };
  }

  return {
    kind: 'api',
    message: fallbackMessage,
    description: undefined,
  };
};

export const toPanelError = (error: unknown, fallbackMessage: string) => {
  const info = getTransportErrorInfo(error, fallbackMessage);
  return {
    message: info.message,
    meta: info.description ?? statusDescription(info.status),
  };
};
