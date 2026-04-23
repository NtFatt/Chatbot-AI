-- CreateIndex
CREATE INDEX "messages_sessionId_updatedAt_idx" ON "messages"("sessionId", "updatedAt");
