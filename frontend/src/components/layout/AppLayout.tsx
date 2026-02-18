import { useAuth } from "@/stores/authStore";
import { useTranslation } from "react-i18next";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LanguageSwitcher } from "./LanguageSwitcher";

export const AppLayout = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="nav-brand">
          <div className="nav-logo">
            <img src="/wallet.svg" alt="Ilia Wallet" width={28} height={28} />
          </div>
          <span className="nav-brand-name">{t("app.name")}</span>
        </div>

        <div className="nav-links">
          <Link to="/dashboard" className={`nav-link ${isActive("/dashboard") ? "nav-link-active" : ""}`}>
            {t("nav.dashboard")}
          </Link>
          <Link to="/transactions" className={`nav-link ${isActive("/transactions") ? "nav-link-active" : ""}`}>
            {t("nav.transactions")}
          </Link>
        </div>

        <div className="nav-right">
          <span className="nav-user">
            {user?.first_name} {user?.last_name}
          </span>
          <LanguageSwitcher />
          <button onClick={handleLogout} className="nav-logout">
            {t("nav.logout")}
          </button>
        </div>
      </nav>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
};
