import { expect, type Page } from "@playwright/test";

export async function loginAsUser(page: Page) {
  await page.goto("/");
  await page.getByLabel(/^email$/i).fill("user");
  await page.getByLabel(/password/i).fill("password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
}

export async function fetchVerificationCode(
  request: import("@playwright/test").APIRequestContext,
  email: string,
): Promise<string> {
  const response = await request.get(
    `/api/auth/test/last-code?email=${encodeURIComponent(email)}`,
  );
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { code: string };
  return body.code;
}
