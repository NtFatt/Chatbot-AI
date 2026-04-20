import { env } from './env';

const localDevHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

const isConfiguredOrigin = (origin: string) => env.clientOrigins.includes(origin);

const isDevelopmentLocalOrigin = (origin: string) => {
  if (env.NODE_ENV === 'production') {
    return false;
  }

  try {
    const url = new URL(origin);
    const isHttp = url.protocol === 'http:' || url.protocol === 'https:';

    return isHttp && localDevHosts.has(url.hostname);
  } catch {
    return false;
  }
};

export const isAllowedOrigin = (origin?: string | null) => {
  if (!origin) {
    return true;
  }

  return isConfiguredOrigin(origin) || isDevelopmentLocalOrigin(origin);
};

export const corsOriginDelegate = (
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
) => {
  callback(null, isAllowedOrigin(origin));
};
