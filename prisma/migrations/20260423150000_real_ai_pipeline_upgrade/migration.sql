-- CreateEnum
CREATE TYPE "AIFinishReason" AS ENUM ('stop', 'length', 'error', 'unknown');

-- AlterTable
ALTER TABLE "messages"
ADD COLUMN "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "inputTokens" INTEGER,
ADD COLUMN "outputTokens" INTEGER,
ADD COLUMN "parentClientMessageId" TEXT,
ADD COLUMN "providerRequestId" TEXT,
ADD COLUMN "responseFinishReason" "AIFinishReason",
ADD COLUMN "retrievalSnapshot" JSONB,
ADD COLUMN "totalTokens" INTEGER;

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "messageId" TEXT,
    "provider" "ProviderKey" NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalTokens" INTEGER,
    "latencyMs" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
    "estimatedCost" DECIMAL(12,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_incidents" (
    "id" TEXT NOT NULL,
    "provider" "ProviderKey" NOT NULL,
    "model" TEXT NOT NULL,
    "errorCode" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "retryable" BOOLEAN NOT NULL DEFAULT false,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messages_sessionId_parentClientMessageId_idx" ON "messages"("sessionId", "parentClientMessageId");

-- CreateIndex
CREATE INDEX "ai_usage_logs_provider_createdAt_idx" ON "ai_usage_logs"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_logs_sessionId_createdAt_idx" ON "ai_usage_logs"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_logs_userId_createdAt_idx" ON "ai_usage_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "provider_incidents_provider_createdAt_idx" ON "provider_incidents"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "provider_incidents_errorCode_createdAt_idx" ON "provider_incidents"("errorCode", "createdAt");

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
