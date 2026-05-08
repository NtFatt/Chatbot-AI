-- Add lastReadAt column to track when a user last viewed a session
ALTER TABLE "chat_sessions" ADD COLUMN "lastReadAt" TIMESTAMP(3);

-- Index for "unread" sessions query (sessions with activity since last read)
CREATE INDEX "chat_sessions_userId_lastReadAt_idx" ON "chat_sessions"("userId", "lastReadAt" DESC);
