-- AlterTable
ALTER TABLE "chat_sessions" ADD COLUMN "aiRuntimeMode" TEXT NOT NULL DEFAULT 'external_api';
