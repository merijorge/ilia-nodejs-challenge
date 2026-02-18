import { createTransaction, getBalance, getTransactions, type CreateTransactionPayload } from "@/api/wallet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export const WALLET_KEYS = {
  balance: ["wallet", "balance"] as const,
  transactions: ["wallet", "transactions"] as const,
};

export const useBalance = () =>
  useQuery({
    queryKey: WALLET_KEYS.balance,
    queryFn: getBalance,
  });

export const useTransactions = () =>
  useQuery({
    queryKey: WALLET_KEYS.transactions,
    queryFn: getTransactions,
  });

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (payload: CreateTransactionPayload) => createTransaction(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WALLET_KEYS.balance });
      queryClient.invalidateQueries({ queryKey: WALLET_KEYS.transactions });
      toast.success(t("transactions.success"));
    },
    onError: (error: AxiosError<{ message: string }>) => {
      const status = error?.response?.status;
      const message = error?.response?.data?.message;
      if (status === 400 && message === "Insufficient funds") {
        toast.error(t("errors.insufficientFunds"));
      } else {
        toast.error(t("errors.generic"));
      }
    },
  });
};
