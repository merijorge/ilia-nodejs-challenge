import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import i18n from "../i18n-test";

const renderWithI18n = (component: React.ReactElement) =>
  render(<I18nextProvider i18n={i18n}>{component}</I18nextProvider>);

describe("LanguageSwitcher", () => {
  it("renders current language", () => {
    i18n.changeLanguage("en");
    renderWithI18n(<LanguageSwitcher />);
    expect(screen.getByRole("button")).toHaveTextContent("EN");
  });

  it("toggles language on click", () => {
    i18n.changeLanguage("en");
    renderWithI18n(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button"));
    expect(i18n.language).toBe("pt");
  });

  it("toggles back to EN from PT", () => {
    i18n.changeLanguage("pt");
    renderWithI18n(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole("button"));
    expect(i18n.language).toBe("en");
  });
});
