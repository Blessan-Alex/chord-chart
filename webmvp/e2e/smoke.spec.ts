import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "LF ChordApp" })).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("home links to sign in when signed out", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  });

  test("sessions page requires sign in", async ({ page }) => {
    await page.goto("/sessions");
    await expect(
      page.getByRole("heading", { name: /sign in required/i }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("offline banner hidden when online", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText("You're offline. Cached songs and sessions may still be available."),
    ).toHaveCount(0);
  });
});
