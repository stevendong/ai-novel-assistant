-- CreateTable
CREATE TABLE "AICallLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "novelId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "apiUrl" TEXT,
    "taskType" TEXT,
    "requestMessages" TEXT NOT NULL,
    "requestParams" TEXT,
    "responseContent" TEXT,
    "responseMetadata" TEXT,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER,
    "estimatedCost" DOUBLE PRECISION DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "sessionId" TEXT,
    "conversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AICallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "novelId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "successfulCalls" INTEGER NOT NULL DEFAULT 0,
    "failedCalls" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgLatencyMs" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIUsageStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AICallLog_userId_idx" ON "AICallLog"("userId");

-- CreateIndex
CREATE INDEX "AICallLog_novelId_idx" ON "AICallLog"("novelId");

-- CreateIndex
CREATE INDEX "AICallLog_provider_idx" ON "AICallLog"("provider");

-- CreateIndex
CREATE INDEX "AICallLog_taskType_idx" ON "AICallLog"("taskType");

-- CreateIndex
CREATE INDEX "AICallLog_status_idx" ON "AICallLog"("status");

-- CreateIndex
CREATE INDEX "AICallLog_createdAt_idx" ON "AICallLog"("createdAt");

-- CreateIndex
CREATE INDEX "AICallLog_userId_createdAt_idx" ON "AICallLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AICallLog_apiUrl_idx" ON "AICallLog"("apiUrl");

-- CreateIndex
CREATE INDEX "AIUsageStats_userId_idx" ON "AIUsageStats"("userId");

-- CreateIndex
CREATE INDEX "AIUsageStats_novelId_idx" ON "AIUsageStats"("novelId");

-- CreateIndex
CREATE INDEX "AIUsageStats_date_idx" ON "AIUsageStats"("date");

-- CreateIndex
CREATE INDEX "AIUsageStats_provider_idx" ON "AIUsageStats"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "AIUsageStats_userId_provider_model_date_novelId_key" ON "AIUsageStats"("userId", "provider", "model", "date", "novelId");

-- AddForeignKey
ALTER TABLE "AICallLog" ADD CONSTRAINT "AICallLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AICallLog" ADD CONSTRAINT "AICallLog_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageStats" ADD CONSTRAINT "AIUsageStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageStats" ADD CONSTRAINT "AIUsageStats_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
