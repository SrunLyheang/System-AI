-- CreateTable
CREATE TABLE "ProjectSpec" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectSpec_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectSpec_projectId_createdAt_idx" ON "ProjectSpec"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProjectSpec" ADD CONSTRAINT "ProjectSpec_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
