import { expect, test } from "@playwright/test";

test("registers a new user with an empty board", async ({ page }) => {
  const username = `user${Date.now()}`;

  await page.goto("/");
  await page.getByRole("button", { name: /create one/i }).click();
  await page.getByLabel(/username/i).fill(username);
  await page.getByLabel(/password/i).fill("secret123");
  await page.getByRole("button", { name: /create account/i }).click();

  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
  await expect(page.getByText(/signed in as/i)).toBeVisible();
  await expect(page.getByText(/0 cards/i).first()).toBeVisible();
});

test("edits a card title", async ({ page }) => {
  const { loginAsUser } = await import("./helpers");
  await loginAsUser(page);

  const card = page.getByTestId("card-card-1");
  await card.getByRole("button", { name: /edit align roadmap themes/i }).click();
  await page.getByLabel(/^title$/i).fill("Edited via E2E");
  await page.getByRole("button", { name: /^save$/i }).click();

  await expect(page.getByText("Edited via E2E")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Edited via E2E")).toBeVisible();
});
