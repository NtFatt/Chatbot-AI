import jwt from 'jsonwebtoken';

import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  typ: 'access';
}

export const signAccessToken = (payload: { userId: string; sessionId: string }) => {
  return jwt.sign(
    {
      sub: payload.userId,
      sid: payload.sessionId,
      typ: 'access',
    } satisfies AccessTokenPayload,
    env.JWT_SECRET,
    {
      expiresIn: `${env.ACCESS_TOKEN_TTL_MINUTES}m`,
    },
  );
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
};
