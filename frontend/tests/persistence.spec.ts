import { expect, test } from "@playwright/test";
import { loginAsUser } from "./helpers";

test("persists board changes across reload", async ({ page }) => {
  await loginAsUser(page);
  const firstColumn = page.getByTestId("column-col-backlog");
  const titleInput = firstColumn.getByLabel("Column title");
  await titleInput.fill("Persisted Backlog");

  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
  await expect(page.getByTestId("column-col-backlog").getByLabel("Column title")).toHaveValue(
    "Persisted Backlog"
  );
});

test("handles two rapid card additions", async ({ page }) => {
  await loginAsUser(page);
  const firstColumn = page.locator('[data-testid^="column-"]').first();

  for (const title of ["Rapid Card A", "Rapid Card B"]) {
    await firstColumn.getByRole("button", { name: /add a card/i }).click();
    await firstColumn.getByPlaceholder("Card title").fill(title);
    await firstColumn.getByRole("button", { name: /add card/i }).click();
    await expect(firstColumn.getByText(title)).toBeVisible();
  }

  await page.reload();
  await expect(page.getByRole("heading", { name: "Kanban Studio" })).toBeVisible();
  const column = page.locator('[data-testid^="column-"]').first();
  await expect(column.getByText("Rapid Card A")).toBeVisible();
  await expect(column.getByText("Rapid Card B")).toBeVisible();
});
