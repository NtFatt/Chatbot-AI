import type { AppLanguage } from '../constants/ui';

export interface AuthUser {
  id: string;
  displayName: string;
  preferredLanguage: AppLanguage;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

export interface AuthSessionInfo {
  id: string;
  expiresAt: string;
  lastUsedAt: string;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
  session: AuthSessionInfo;
}
