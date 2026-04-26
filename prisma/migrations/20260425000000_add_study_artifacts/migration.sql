-- AddStudyArtifacts: Create StudyArtifact model for flashcard, quiz, summary, and note persistence

-- CreateTable
CREATE TABLE "study_artifacts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "messageId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "study_artifacts_userId_createdAt_idx" ON "study_artifacts"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "study_artifacts_userId_type_idx" ON "study_artifacts"("userId", "type");

-- CreateIndex
CREATE INDEX "study_artifacts_sessionId_idx" ON "study_artifacts"("sessionId");

-- CreateIndex
CREATE INDEX "study_artifacts_messageId_idx" ON "study_artifacts"("messageId");

-- AddForeignKey: study_artifacts.userId -> users.id
ALTER TABLE "study_artifacts" ADD CONSTRAINT "study_artifacts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: study_artifacts.sessionId -> chat_sessions.id
ALTER TABLE "study_artifacts" ADD CONSTRAINT "study_artifacts_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: study_artifacts.messageId -> messages.id
ALTER TABLE "study_artifacts" ADD CONSTRAINT "study_artifacts_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
