-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "jiraKey" TEXT,
    "jiraUrl" TEXT,
    "title" TEXT NOT NULL,
    "issueType" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_jiraKey_key" ON "Ticket"("jiraKey");

-- CreateIndex
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");
