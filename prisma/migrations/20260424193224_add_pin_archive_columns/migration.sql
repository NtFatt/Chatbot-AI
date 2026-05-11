-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('summary', 'flashcard_set', 'quiz_set', 'note');

-- DropIndex
DROP INDEX "chat_sessions_userId_updatedAt_idx";

-- AlterTable
ALTER TABLE "chat_sessions" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pinnedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "chat_sessions_userId_isPinned_updatedAt_idx" ON "chat_sessions"("userId", "isPinned" DESC, "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "chat_sessions_userId_isArchived_updatedAt_idx" ON "chat_sessions"("userId", "isArchived", "updatedAt" DESC);
