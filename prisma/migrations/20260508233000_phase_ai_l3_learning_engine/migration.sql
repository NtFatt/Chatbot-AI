-- Phase AI-L3 Learning Engine foundation:
-- artifact review history, dataset management, evaluation harness, and model registry tables.

-- CreateEnum
CREATE TYPE "ReviewSelfAssessment" AS ENUM ('again', 'hard', 'good', 'easy');

-- CreateEnum
CREATE TYPE "TrainingDatasetStatus" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "TrainingExampleSourceType" AS ENUM ('chat_message', 'artifact_refinement', 'manual');

-- CreateEnum
CREATE TYPE "TrainingExampleStatus" AS ENUM ('draft', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "EvalCategory" AS ENUM (
    'explain_concept',
    'socratic_hint',
    'grade_answer',
    'generate_quiz',
    'summarize_lesson',
    'source_grounded_answer',
    'fallback_transparency'
);

-- CreateEnum
CREATE TYPE "ModelVersionProvider" AS ENUM ('gemini', 'openai', 'fine_tuned_openai', 'local_ollama', 'local_lora');

-- CreateEnum
CREATE TYPE "ModelVersionStatus" AS ENUM ('draft', 'training', 'ready', 'failed', 'archived');

-- CreateEnum
CREATE TYPE "TrainingJobStatus" AS ENUM ('draft', 'queued', 'running', 'succeeded', 'failed');

-- CreateTable
CREATE TABLE "review_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "itemIndex" INTEGER NOT NULL,
    "selfAssessment" "ReviewSelfAssessment" NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_datasets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "TrainingDatasetStatus" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_examples" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "sourceType" "TrainingExampleSourceType" NOT NULL,
    "sourceId" TEXT,
    "subject" TEXT,
    "topic" TEXT,
    "learningMode" TEXT,
    "userLevel" TEXT,
    "inputMessages" JSONB NOT NULL,
    "idealResponse" TEXT NOT NULL,
    "qualityScore" INTEGER NOT NULL DEFAULT 3,
    "status" "TrainingExampleStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_examples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eval_cases" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "EvalCategory" NOT NULL,
    "inputMessages" JSONB NOT NULL,
    "idealResponse" TEXT,
    "scoringNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eval_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_versions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" "ModelVersionProvider" NOT NULL,
    "baseModel" TEXT NOT NULL,
    "fineTunedModel" TEXT,
    "status" "ModelVersionStatus" NOT NULL DEFAULT 'draft',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eval_runs" (
    "id" TEXT NOT NULL,
    "provider" "ProviderKey" NOT NULL,
    "model" TEXT NOT NULL,
    "modelVersionId" TEXT,
    "averageScore" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eval_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eval_run_results" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "evalCaseId" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eval_run_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_jobs" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "provider" "ModelVersionProvider" NOT NULL,
    "baseModel" TEXT NOT NULL,
    "status" "TrainingJobStatus" NOT NULL DEFAULT 'draft',
    "externalJobId" TEXT,
    "modelVersionId" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_history_userId_reviewedAt_idx" ON "review_history"("userId", "reviewedAt");

-- CreateIndex
CREATE INDEX "review_history_artifactId_idx" ON "review_history"("artifactId");

-- CreateIndex
CREATE INDEX "training_datasets_status_updatedAt_idx" ON "training_datasets"("status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "training_examples_datasetId_status_updatedAt_idx" ON "training_examples"("datasetId", "status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "training_examples_sourceType_sourceId_idx" ON "training_examples"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "eval_cases_category_updatedAt_idx" ON "eval_cases"("category", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "model_versions_provider_isActive_idx" ON "model_versions"("provider", "isActive");

-- CreateIndex
CREATE INDEX "model_versions_status_updatedAt_idx" ON "model_versions"("status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "eval_runs_provider_createdAt_idx" ON "eval_runs"("provider", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "eval_runs_modelVersionId_idx" ON "eval_runs"("modelVersionId");

-- CreateIndex
CREATE INDEX "eval_run_results_runId_idx" ON "eval_run_results"("runId");

-- CreateIndex
CREATE INDEX "eval_run_results_evalCaseId_idx" ON "eval_run_results"("evalCaseId");

-- CreateIndex
CREATE INDEX "training_jobs_datasetId_createdAt_idx" ON "training_jobs"("datasetId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "training_jobs_provider_status_createdAt_idx" ON "training_jobs"("provider", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "training_jobs_modelVersionId_idx" ON "training_jobs"("modelVersionId");

-- AddForeignKey
ALTER TABLE "review_history" ADD CONSTRAINT "review_history_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_history" ADD CONSTRAINT "review_history_artifactId_fkey"
    FOREIGN KEY ("artifactId") REFERENCES "study_artifacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_examples" ADD CONSTRAINT "training_examples_datasetId_fkey"
    FOREIGN KEY ("datasetId") REFERENCES "training_datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_runs" ADD CONSTRAINT "eval_runs_modelVersionId_fkey"
    FOREIGN KEY ("modelVersionId") REFERENCES "model_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_run_results" ADD CONSTRAINT "eval_run_results_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "eval_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_run_results" ADD CONSTRAINT "eval_run_results_evalCaseId_fkey"
    FOREIGN KEY ("evalCaseId") REFERENCES "eval_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_jobs" ADD CONSTRAINT "training_jobs_datasetId_fkey"
    FOREIGN KEY ("datasetId") REFERENCES "training_datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_jobs" ADD CONSTRAINT "training_jobs_modelVersionId_fkey"
    FOREIGN KEY ("modelVersionId") REFERENCES "model_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
