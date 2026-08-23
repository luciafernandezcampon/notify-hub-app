-- CreateEnum
CREATE TYPE "AnalysisSource" AS ENUM ('manual', 'webhook');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('analyzed', 'accepted', 'rejected', 'error');

-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "source" "AnalysisSource" NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'analyzed',
    "impact" TEXT,
    "summary" TEXT,
    "resultJson" JSONB NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentationManifest" (
    "id" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "manifestJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentationManifest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangelogSync" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "originalContent" TEXT,
    "finalContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangelogSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Analysis_repo_prNumber_idx" ON "Analysis"("repo", "prNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentationManifest_repo_key" ON "DocumentationManifest"("repo");

-- CreateIndex
CREATE INDEX "ChangelogSync_analysisId_idx" ON "ChangelogSync"("analysisId");

-- AddForeignKey
ALTER TABLE "ChangelogSync" ADD CONSTRAINT "ChangelogSync_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
