import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateTransaction, useTransactions } from "@/hooks/useWallet";
import type { Transaction } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

const transactionSchema = z.object({
  amount: z
    .number()
    .min(0.01, "Minimum amount is 0.01")
    .max(1000000, "Maximum amount is 1,000,000")
    .refine(
      val => {
        const decimals = val.toString().split(".")[1];
        return !decimals || decimals.length <= 2;
      },
      { message: "Maximum 2 decimal places" },
    ),
  type: z.enum(["CREDIT", "DEBIT"]),
});

type TransactionForm = z.infer<typeof transactionSchema>;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));

const TransactionRow = ({ tx }: { tx: Transaction }) => {
  const { t } = useTranslation();
  return (
    <div className="tx-row">
      <div className="tx-type-indicator">
        <span className={`tx-dot tx-dot-${tx.type.toLowerCase()}`} />
      </div>
      <div className="tx-info">
        <span className="tx-type-label">
          {tx.type === "CREDIT" ? t("transactions.credit") : t("transactions.debit")}
        </span>
        <span className="tx-date">{formatDate(tx.createdAt)}</span>
      </div>
      <div className="tx-amount-wrap">
        <span className={`tx-amount tx-amount-${tx.type.toLowerCase()}`}>
          {tx.type === "CREDIT" ? "+" : "-"}
          {formatCurrency(tx.amount)}
        </span>
        <Badge variant="outline" className={`tx-badge tx-badge-${tx.type.toLowerCase()}`}>
          {tx.type === "CREDIT" ? t("transactions.credit") : t("transactions.debit")}
        </Badge>
      </div>
    </div>
  );
};

export const TransactionsPage = () => {
  const { t } = useTranslation();
  const { data: transactions, isLoading } = useTransactions();
  const createMutation = useCreateTransaction();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TransactionForm>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { type: "CREDIT" },
  });

  const selectedType = watch("type");

  const onSubmit = (data: TransactionForm) => {
    createMutation.mutate(data, {
      onSuccess: () => reset({ type: selectedType, amount: NaN }),
    });
  };

  return (
    <div className="transactions-page">
      {/* Create Transaction Form */}
      <div className="create-tx-card">
        <h2 className="create-tx-title">{t("transactions.create")}</h2>
        <p className="create-tx-subtitle">{t("transactions.createSubtitle")}</p>

        <form onSubmit={handleSubmit(onSubmit)} className="create-tx-form" noValidate>
          {/* Type Toggle */}
          <div className="type-toggle">
            <button
              type="button"
              className={`type-btn ${selectedType === "CREDIT" ? "type-btn-active type-btn-credit" : ""}`}
              onClick={() => setValue("type", "CREDIT")}
            >
              {t("transactions.credit")}
            </button>
            <button
              type="button"
              className={`type-btn ${selectedType === "DEBIT" ? "type-btn-active type-btn-debit" : ""}`}
              onClick={() => setValue("type", "DEBIT")}
            >
              {t("transactions.debit")}
            </button>
          </div>

          {/* Amount */}
          <div className="form-field">
            <label className="form-label">{t("transactions.amount")}</label>
            <div className="amount-input-wrap">
              <span className="amount-currency-symbol">$</span>
              <input
                {...register("amount", { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0.01"
                max="1000000"
                placeholder="0.00"
                className={`form-input amount-input ${errors.amount ? "form-input-error" : ""}`}
              />
            </div>
            {errors.amount && <span className="form-error">{errors.amount.message}</span>}
          </div>

          <Button type="submit" disabled={createMutation.isPending} className="auth-submit-btn">
            {createMutation.isPending ? t("common.loading") : t("transactions.submit")}
          </Button>
        </form>
      </div>

      {/* Transaction History */}
      <div className="recent-section">
        <div className="recent-header">
          <h2 className="recent-title">{t("transactions.history")}</h2>
          {transactions && <span className="tx-count">{t("transactions.count", { count: transactions.length })}</span>}
        </div>

        <div className="tx-list">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="tx-skeleton" />)
          ) : !transactions || transactions.length === 0 ? (
            <div className="tx-empty">
              <p>{t("transactions.empty")}</p>
            </div>
          ) : (
            transactions.map(tx => <TransactionRow key={tx.id} tx={tx} />)
          )}
        </div>
      </div>
    </div>
  );
};
