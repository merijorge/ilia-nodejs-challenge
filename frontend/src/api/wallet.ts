import type { Transaction, TransactionType, Wallet } from "../types";
import { walletApi } from "./axios";

export const getBalance = async (): Promise<Wallet> => {
  const { data } = await walletApi.get<Wallet>("/wallet/balance");
  return data;
};

export const getTransactions = async (): Promise<Transaction[]> => {
  const { data } = await walletApi.get<Transaction[]>("/transactions");
  return data;
};

export interface CreateTransactionPayload {
  amount: number;
  type: TransactionType;
}

export const createTransaction = async (payload: CreateTransactionPayload): Promise<Transaction> => {
  const idempotencyKey = crypto.randomUUID();
  const { data } = await walletApi.post<Transaction>("/transactions", payload, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return data;
};
