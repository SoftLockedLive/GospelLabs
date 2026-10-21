import { expect, test } from "@playwright/test";
import { createInvestigation, expectSaved } from "./helpers";

test("another tab's changes are noticed at once, and neither tab silently overwrites the other", async ({ page, context }) => {
  const url = await createInvestigation(page, "Two tabs");
  const other = await context.newPage();
  await other.goto(url);
  const question = (tab: typeof page) => tab.getByRole("textbox", { name: "Question", exact: true });
  await other.getByRole("navigation", { name: "Investigation sections" }).getByRole("button", { name: /Question/ }).click();
  await page.getByRole("navigation", { name: "Investigation sections" }).getByRole("button", { name: /Question/ }).click();

  // The other tab saves; this one, with nothing unsaved, offers to load the newer copy.
  await question(other).fill("Edited in the other tab");
  await expectSaved(other);
  await expect(page.getByRole("alert").filter({ hasText: "updated in another tab or window" })).toBeVisible();
  await page.getByRole("button", { name: "Load the latest version" }).click();
  await expect(question(page)).toHaveValue("Edited in the other tab");

  // Now the other tab is behind. Typing there anyway doesn't overwrite: the user decides.
  await question(page).fill("Edited here, after loading");
  await expectSaved(page);
  await expect(other.getByRole("alert").filter({ hasText: "updated in another tab or window" })).toBeVisible();
  await question(other).fill("Typed in the stale tab");
  const conflict = other.getByRole("alert").filter({ hasText: "changed in another tab or window" });
  await expect(conflict).toBeVisible();
  await expect(conflict).toContainText("nothing has been overwritten");

  // The stale tab's text was never written over the newer copy.
  await page.reload();
  await expect(question(page)).toHaveValue("Edited here, after loading");

  // Choosing "Keep my version" is explicit, and the first tab then notices it.
  await conflict.getByRole("button", { name: "Keep my version" }).click();
  await expectSaved(other);
  await expect(page.getByRole("alert").filter({ hasText: "updated in another tab or window" })).toBeVisible();
  await page.getByRole("button", { name: "Load the latest version" }).click();
  await expect(question(page)).toHaveValue("Typed in the stale tab");
});
