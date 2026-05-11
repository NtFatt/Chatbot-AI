-- Add isFavorited and shareToken to study_artifacts
ALTER TABLE "study_artifacts" ADD COLUMN "isFavorited" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "study_artifacts" ADD COLUMN "shareToken" VARCHAR(255) NULL;

CREATE UNIQUE INDEX "study_artifacts_shareToken_key" ON "study_artifacts"("shareToken") WHERE "shareToken" IS NOT NULL;
