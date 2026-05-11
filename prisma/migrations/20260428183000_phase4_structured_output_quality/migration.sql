ALTER TABLE "messages"
ADD COLUMN "confidenceScore" DOUBLE PRECISION,
ADD COLUMN "subjectLabel" TEXT,
ADD COLUMN "topicLabel" TEXT,
ADD COLUMN "levelLabel" "MaterialLevel";

ALTER TABLE "study_artifacts"
ADD COLUMN "qualityScore" DOUBLE PRECISION;
