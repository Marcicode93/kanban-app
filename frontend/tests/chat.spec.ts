import { expect, test } from "@playwright/test";
import { loginAsUser } from "./helpers";

test("sends a chat message and receives a response", async ({ page }) => {
  test.skip(!process.env.OPENROUTER_API_KEY, "OPENROUTER_API_KEY not set");

  await loginAsUser(page);
  await page.getByTestId("chat-input").fill("What columns are on this board?");
  await page.getByTestId("chat-submit").click();

  await expect(page.getByTestId("chat-loading")).toBeVisible();
  await expect(page.getByTestId("chat-loading")).toBeHidden({ timeout: 90_000 });
  await expect(page.getByTestId("chat-message-assistant").last()).not.toBeEmpty();
});

test("AI can add a card to the board", async ({ page }) => {
  test.skip(!process.env.OPENROUTER_API_KEY, "OPENROUTER_API_KEY not set");

  await loginAsUser(page);
  const uniqueTitle = `E2E AI Card ${Date.now()}`;
  await page
    .getByTestId("chat-input")
    .fill(
      `Add a card titled "${uniqueTitle}" to Backlog with details "Created by AI"`
    );
  await page.getByTestId("chat-submit").click();

  await expect(page.getByTestId("chat-loading")).toBeHidden({ timeout: 90_000 });
  await expect(
    page.getByRole("heading", { name: uniqueTitle })
  ).toBeVisible({ timeout: 30_000 });
});
