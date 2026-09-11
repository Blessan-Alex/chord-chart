import { expect, test } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test.describe("auth", () => {
  test.skip(!email || !password, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD");

  test("signed-in user sees library", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: /^Sign in$/i }).click();

    await expect(page.getByRole("heading", { name: "LF ChordApp" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByPlaceholder("Search songs…")).toBeVisible();
  });
});
