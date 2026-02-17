export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at?: string;
  updated_at?: string;
}

export interface Wallet {
  userId: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = "CREDIT" | "DEBIT";

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  createdAt: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
}
