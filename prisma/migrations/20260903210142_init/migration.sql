-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "jiraKey" TEXT,
    "jiraUrl" TEXT,
    "title" TEXT NOT NULL,
    "issueType" TEXT NOT NULL,
    "assigneeAccountId" TEXT,
    "assigneeName" TEXT,
    "startDate" TEXT,
    "dueDate" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_jiraKey_key" ON "Ticket"("jiraKey");

-- CreateIndex
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");
