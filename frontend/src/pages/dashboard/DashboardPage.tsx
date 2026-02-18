import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBalance, useTransactions } from "@/hooks/useWallet";
import { useAuth } from "@/stores/authStore";
import type { Transaction } from "@/types";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));

const TransactionRow = ({ tx }: { tx: Transaction }) => (
  <div className="tx-row">
    <div className="tx-type-indicator">
      <span className={`tx-dot tx-dot-${tx.type.toLowerCase()}`} />
    </div>
    <div className="tx-info">
      <span className="tx-type-label">{tx.type === "CREDIT" ? "Credit" : "Debit"}</span>
      <span className="tx-date">{formatDate(tx.createdAt)}</span>
    </div>
    <div className="tx-amount-wrap">
      <span className={`tx-amount tx-amount-${tx.type.toLowerCase()}`}>
        {tx.type === "CREDIT" ? "+" : "-"}
        {formatCurrency(tx.amount)}
      </span>
      <Badge variant="outline" className={`tx-badge tx-badge-${tx.type.toLowerCase()}`}>
        {tx.type}
      </Badge>
    </div>
  </div>
);

export const DashboardPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: wallet, isLoading: balanceLoading, isError: balanceError } = useBalance();
  const { data: transactions, isLoading: txLoading } = useTransactions();

  const recent = transactions?.slice(0, 5) ?? [];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-greeting">Good day, {user?.first_name}.</h1>
          <p className="dashboard-subtitle">Here's your financial overview.</p>
        </div>
        <Link to="/transactions">
          <Button className="dashboard-cta">{t("transactions.create")}</Button>
        </Link>
      </div>

      {/* Balance Card */}
      <div className="balance-card">
        <div className="balance-card-inner">
          <div className="balance-label">{t("dashboard.balance")}</div>
          {balanceLoading ? (
            <Skeleton className="balance-skeleton" />
          ) : balanceError ? (
            <div className="balance-error">Unable to load balance</div>
          ) : (
            <div className="balance-amount">{formatCurrency(wallet?.balance ?? 0)}</div>
          )}
          <div className="balance-meta">
            {wallet && (
              <span className="balance-updated">
                {t("dashboard.lastUpdated")} {formatDate(wallet.updatedAt)}
              </span>
            )}
          </div>
        </div>
        <div className="balance-decoration">
          <div className="balance-deco-ring balance-deco-ring-1" />
          <div className="balance-deco-ring balance-deco-ring-2" />
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="recent-section">
        <div className="recent-header">
          <h2 className="recent-title">{t("dashboard.recentTransactions")}</h2>
          {transactions && transactions.length > 5 && (
            <Link to="/transactions" className="recent-view-all">
              View all
            </Link>
          )}
        </div>

        <div className="tx-list">
          {txLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="tx-skeleton" />)
          ) : recent.length === 0 ? (
            <div className="tx-empty">
              <p>{t("dashboard.noTransactions")}</p>
              <Link to="/transactions">
                <Button variant="outline" className="tx-empty-cta">
                  {t("transactions.create")}
                </Button>
              </Link>
            </div>
          ) : (
            recent.map(tx => <TransactionRow key={tx.id} tx={tx} />)
          )}
        </div>
      </div>
    </div>
  );
};
