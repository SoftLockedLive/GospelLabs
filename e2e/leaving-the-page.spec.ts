import { expect, test } from "@playwright/test";
import { createInvestigation, expectSaved, goToSection } from "./helpers";

test("edits made just before leaving the page aren't lost", async ({ page }) => {
  // Leaving can trigger the browser's "unsaved changes" prompt; choose to leave.
  page.on("dialog", (dialog) => void dialog.accept());
  const url = await createInvestigation(page, "Leaving quickly");
  await goToSection(page, "Question");
  await page.getByRole("textbox", { name: "Context" }).fill("Typed a moment before leaving");
  await goToSection(page, "Analysis");

  // Leave at once: the autosave delay hasn't passed, and some browsers (Firefox) abandon
  // database writes during unload. The safety copy keeps the edits.
  await page.goto("/library");
  await page.goto(url);
  await goToSection(page, "Question");
  await expect(page.getByRole("textbox", { name: "Context" })).toHaveValue("Typed a moment before leaving");
  await expectSaved(page);

  // Once saved, the copy is gone: a later visit opens normally.
  await page.reload();
  await expect(page.getByText("Restored edits that hadn’t finished saving")).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Context" })).toHaveValue("Typed a moment before leaving");
});
