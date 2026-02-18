import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface AuthLayoutProps {
  children: ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  const { t } = useTranslation();

  return (
    <div className="auth-layout">
      <div className="auth-brand">
        <div className="auth-brand-inner">
          <div className="brand-logo">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="12" fill="#C9A84C" fillOpacity="0.15" />
              <path
                d="M20 8C13.373 8 8 13.373 8 20s5.373 12 12 12 12-5.373 12-12S26.627 8 20 8zm0 4a4 4 0 110 8 4 4 0 010-8zm0 17c-3.314 0-6.253-1.56-8.185-4a10.016 10.016 0 0116.37 0C26.253 27.44 23.314 29 20 29z"
                fill="#C9A84C"
              />
            </svg>
          </div>
          <h1 className="brand-name">{t("app.name")}</h1>
          <p className="brand-tagline">Your wealth, beautifully managed.</p>

          <div className="brand-features">
            {["Secure JWT Authentication", "Real-time Balance", "Transaction History"].map(feature => (
              <div key={feature} className="brand-feature">
                <span className="feature-dot" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="brand-decoration">
          <div className="deco-circle deco-circle-1" />
          <div className="deco-circle deco-circle-2" />
          <div className="deco-circle deco-circle-3" />
        </div>
      </div>

      <div className="auth-content">
        <div className="auth-card">{children}</div>
      </div>
    </div>
  );
};
