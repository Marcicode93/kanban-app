import { expect, test } from "@playwright/test";
import { loginAsUser } from "./helpers";

test("shows login before authentication", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).not.toBeVisible();
});

test("logs in with valid credentials", async ({ page }) => {
  await loginAsUser(page);
  await expect(page.getByText(/signed in as/i)).toBeVisible();
});

test("rejects invalid credentials", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/email/i).fill("user");
  await page.getByLabel(/password/i).fill("wrong");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText(/invalid email or password/i)).toBeVisible();
});

test("logs out back to the login screen", async ({ page }) => {
  await loginAsUser(page);
  await page.getByRole("button", { name: /log out/i }).click();
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
});
