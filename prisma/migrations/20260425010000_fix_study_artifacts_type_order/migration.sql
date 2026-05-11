-- Fix historical migration ordering:
-- study_artifacts is created in 20260425000000_add_study_artifacts.
-- This migration runs after that table exists, then converts type TEXT -> ArtifactType.

ALTER TABLE "study_artifacts"
ALTER COLUMN "type" TYPE "ArtifactType" USING "type"::"ArtifactType",
ALTER COLUMN "updatedAt" DROP DEFAULT;
