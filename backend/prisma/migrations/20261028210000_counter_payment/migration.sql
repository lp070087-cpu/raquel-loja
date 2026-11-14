ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'ON_PICKUP';
ALTER TABLE "Order" ADD COLUMN "stockRestoredAt" TIMESTAMP(3);
CREATE TABLE "CounterPayment" (
 "id" TEXT NOT NULL PRIMARY KEY, "orderId" TEXT NOT NULL, "method" "PaymentMethod" NOT NULL,
 "amountCents" INTEGER NOT NULL CHECK ("amountCents">=0), "employeeId" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CounterPayment_method_check" CHECK ("method"::text IN ('CASH','PIX','CARD')),
 CONSTRAINT "CounterPayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "CounterPayment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CounterPayment_orderId_key" ON "CounterPayment"("orderId");
CREATE TABLE "OrderEvent" (
 "id" TEXT NOT NULL PRIMARY KEY, "orderId" TEXT NOT NULL, "actorId" TEXT NOT NULL,
 "type" TEXT NOT NULL, "details" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "OrderEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId","createdAt");
