export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorEnvelope {
  success: false;
  error: ApiErrorDetail;
  requestId: string;
  timestamp: string;
}

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  requestId: string;
  timestamp: string;
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export interface CursorPaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  totalCount: number;
  hasMore: boolean;
}
