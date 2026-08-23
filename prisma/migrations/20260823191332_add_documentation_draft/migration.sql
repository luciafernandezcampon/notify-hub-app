-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('proposed', 'accepted', 'rejected', 'written');

-- CreateTable
CREATE TABLE "DocumentationDraft" (
    "id" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "title" TEXT,
    "reason" TEXT,
    "originalContent" TEXT,
    "proposedContent" TEXT NOT NULL,
    "finalContent" TEXT,
    "status" "DraftStatus" NOT NULL DEFAULT 'proposed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentationDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentationDraft_repo_idx" ON "DocumentationDraft"("repo");
