import { createHash, randomBytes } from 'node:crypto';

export const generateOpaqueToken = () => randomBytes(48).toString('hex');

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
