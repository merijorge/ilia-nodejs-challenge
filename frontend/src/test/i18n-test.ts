import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enCommon from "../i18n/locales/en/common.json";

i18n.use(initReactI18next).init({
  resources: { en: { common: enCommon } },
  defaultNS: "common",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
