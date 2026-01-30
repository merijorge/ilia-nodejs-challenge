/*
  Warnings:

  - Made the column `idempotency_key` on table `transactions` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "idempotency_key" SET NOT NULL;
