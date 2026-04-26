/*
  Warnings:

  - Changed the type of `type` on the `study_artifacts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('summary', 'flashcard_set', 'quiz_set', 'note');

-- DropIndex
DROP INDEX "chat_sessions_userId_updatedAt_idx";

-- AlterTable
ALTER TABLE "chat_sessions" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pinnedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "study_artifacts" DROP COLUMN "type",
ADD COLUMN     "type" "ArtifactType" NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "chat_sessions_userId_isPinned_updatedAt_idx" ON "chat_sessions"("userId", "isPinned" DESC, "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "chat_sessions_userId_isArchived_updatedAt_idx" ON "chat_sessions"("userId", "isArchived", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "study_artifacts_userId_type_idx" ON "study_artifacts"("userId", "type");
