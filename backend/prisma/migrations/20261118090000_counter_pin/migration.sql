CREATE TABLE "StaffPin" (
 "userId" TEXT PRIMARY KEY,
 "pinHash" TEXT NOT NULL,
 "enabled" BOOLEAN NOT NULL DEFAULT true,
 "failedAttempts" INTEGER NOT NULL DEFAULT 0 CHECK ("failedAttempts" BETWEEN 0 AND 5),
 "lockedUntil" TIMESTAMP(3),
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "StaffPin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "CounterTerminal" (
 "id" TEXT PRIMARY KEY,
 "name" TEXT NOT NULL,
 "tokenHash" TEXT NOT NULL,
 "createdById" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "revokedAt" TIMESTAMP(3),
 CONSTRAINT "CounterTerminal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CounterTerminal_tokenHash_key" ON "CounterTerminal"("tokenHash");
CREATE INDEX "CounterTerminal_expiresAt_revokedAt_idx" ON "CounterTerminal"("expiresAt","revokedAt");
ALTER TABLE "Session" ADD COLUMN "terminalId" TEXT;
ALTER TABLE "Session" ADD CONSTRAINT "Session_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "CounterTerminal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Session_terminalId_revokedAt_idx" ON "Session"("terminalId","revokedAt");
