-- Sync schema drift: fields/tables added after init (contentHash, figures, weights, ESSAY, joinCode)

-- QuestionType: ESSAY
DO $$ BEGIN
  ALTER TYPE "QuestionType" ADD VALUE IF NOT EXISTS 'ESSAY';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ClassRoom.joinCode (required for invite codes)
ALTER TABLE "ClassRoom" ADD COLUMN IF NOT EXISTS "joinCode" TEXT;
UPDATE "ClassRoom"
SET "joinCode" = upper(substr(replace(id, '-', ''), 1, 8))
WHERE "joinCode" IS NULL OR "joinCode" = '';
CREATE UNIQUE INDEX IF NOT EXISTS "ClassRoom_joinCode_key" ON "ClassRoom"("joinCode");
ALTER TABLE "ClassRoom" ALTER COLUMN "joinCode" SET NOT NULL;

-- Subject.name unique (schema @unique)
CREATE UNIQUE INDEX IF NOT EXISTS "Subject_name_key" ON "Subject"("name");

-- UserMaterial.contentHash (dedupe uploads)
ALTER TABLE "UserMaterial" ADD COLUMN IF NOT EXISTS "contentHash" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "UserMaterial_contentHash_key" ON "UserMaterial"("contentHash");

-- Question.weight + figureId
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "weight" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "figureId" TEXT;

-- MaterialFigure table
CREATE TABLE IF NOT EXISTS "MaterialFigure" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "bboxJson" JSONB NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "nearbyText" TEXT,
    "areaRatio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialFigure_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MaterialFigure_materialId_idx" ON "MaterialFigure"("materialId");

DO $$ BEGIN
  ALTER TABLE "MaterialFigure"
    ADD CONSTRAINT "MaterialFigure_materialId_fkey"
    FOREIGN KEY ("materialId") REFERENCES "UserMaterial"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Question"
    ADD CONSTRAINT "Question_figureId_fkey"
    FOREIGN KEY ("figureId") REFERENCES "MaterialFigure"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
