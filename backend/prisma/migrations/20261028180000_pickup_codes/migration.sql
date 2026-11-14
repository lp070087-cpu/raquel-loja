-- Additive migration. Existing encrypted codes are preserved for guarded backfill.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'STAFF';
ALTER TABLE "Order" ADD COLUMN "pickedUpAt" TIMESTAMP(3),
 ADD COLUMN "pickedUpById" TEXT,
 ADD COLUMN "pickupAttempts" INTEGER NOT NULL DEFAULT 0,
 ADD COLUMN "pickupLockedUntil" TIMESTAMP(3);
ALTER TABLE "Order" ADD CONSTRAINT "Order_pickup_attempts_check" CHECK ("pickupAttempts" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_pickup_audit_check" CHECK (("pickedUpAt" IS NULL) = ("pickedUpById" IS NULL));
ALTER TABLE "Order" ADD CONSTRAINT "Order_pickup_employee_fkey" FOREIGN KEY ("pickedUpById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "PickupCodeReservation" (
 "codeHash" TEXT NOT NULL PRIMARY KEY,
 "orderId" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "consumedAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX "PickupCodeReservation_orderId_key" ON "PickupCodeReservation"("orderId");
