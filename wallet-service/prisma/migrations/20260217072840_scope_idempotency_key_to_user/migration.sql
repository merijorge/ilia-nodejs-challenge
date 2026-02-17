/*
  Warnings:

  - A unique constraint covering the columns `[user_id,idempotency_key]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "transactions_idempotency_key_key";

-- CreateIndex
CREATE UNIQUE INDEX "transactions_user_id_idempotency_key_key" ON "transactions"("user_id", "idempotency_key");
