import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TELEGRAM_BOT_URL } from "@/lib/telegram-bot";
import { TelegramBotCta } from "./telegram-bot-cta";

describe("TelegramBotCta", () => {
  it("links to the configured Telegram bot URL with safe external link attributes", () => {
    render(<TelegramBotCta />);
    const link = screen.getByRole("link", { name: /telegram/i });
    expect(link).toHaveAttribute("href", TELEGRAM_BOT_URL);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
