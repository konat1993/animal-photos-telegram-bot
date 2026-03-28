import { expect, test } from "@playwright/test";

test.describe("Dashboard (demo mode)", () => {
  test("shows main heading", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Animal Reports" }),
    ).toBeVisible();
  });

  test("Telegram CTA links to public bot", async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: /telegram/i });
    await expect(link).toHaveAttribute("href", "https://t.me/AnimalPhotosBot");
    await expect(link).toHaveAttribute("target", "_blank");
  });

  test("shows KPI cards with demo data", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Total Reports")).toBeVisible();
    await expect(page.getByText("Top Species")).toBeVisible();
    await expect(page.getByText("Avg Confidence")).toBeVisible();
  });

  test("theme toggle is present", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Toggle theme" }),
    ).toBeVisible();
  });
});
