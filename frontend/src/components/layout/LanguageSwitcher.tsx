import { useTranslation } from "react-i18next";

const languages = [
  { code: "en", label: "EN" },
  { code: "pt", label: "PT" },
];

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const current = i18n.language?.split("-")[0] ?? "en";

  const toggle = () => {
    const next = current === "en" ? "pt" : "en";
    i18n.changeLanguage(next);
  };

  return (
    <button className="lang-switcher" onClick={toggle} aria-label="Switch language">
      {languages.find(l => l.code === current)?.label ?? "EN"}
      <span className="lang-divider">/</span>
      {languages.find(l => l.code !== current)?.label}
    </button>
  );
};
