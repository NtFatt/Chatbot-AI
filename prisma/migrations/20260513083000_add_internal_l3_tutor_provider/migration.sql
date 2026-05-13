-- Extend runtime provider enums so Level 3 can persist an internal executor path.
ALTER TYPE "ProviderKey" ADD VALUE IF NOT EXISTS 'internal_l3_tutor';
ALTER TYPE "ModelVersionProvider" ADD VALUE IF NOT EXISTS 'internal_l3_tutor';
