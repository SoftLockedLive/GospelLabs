import { expect, test } from "@playwright/test";
import { createInvestigation, expectSaved, goToSection, libraryItem } from "./helpers";

test("create, edit, resume, conclude, and reopen an investigation", async ({ page }) => {
  // Create from the dashboard.
  await page.goto("/");
  await page.getByRole("link", { name: "New research notebook" }).click();
  await expect(page.getByText(/Not saved yet/)).toBeVisible();
  await page.getByRole("textbox", { name: "Question", exact: true }).fill("What does it mean to take up the cross?");
  await page.getByRole("textbox", { name: "Title" }).fill("Taking up the cross");
  await expectSaved(page);
  await expect(page).toHaveURL(/\/investigations\/view\?id=/);

  // Edit: hypothesis, evidence, and a claim linked to that evidence.
  await goToSection(page, "Hypothesis");
  await page.getByRole("button", { name: "Add a hypothesis" }).click();
  await page.getByRole("textbox", { name: "Hypothesis 1" }).fill("It means choosing discipleship every day.");

  await goToSection(page, "Research");
  await page.getByRole("button", { name: "Add evidence", exact: true }).first().click();
  await page.getByRole("textbox", { name: "Source title or reference" }).fill("Luke 9:23");
  await page.getByRole("textbox", { name: "Observation" }).fill("Jesus says to take up the cross daily.");
  await page.locator("form").getByRole("button", { name: "Add evidence" }).click();

  await goToSection(page, "Analysis");
  await page.getByRole("button", { name: "Add a claim" }).click();
  await page.getByRole("textbox", { name: "Claim 1" }).fill("Discipleship is described as daily.");
  await page.getByRole("button", { name: "Link evidence" }).click();
  await page.getByRole("checkbox", { name: /E1/ }).check();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("list", { name: "Evidence linked to claim 1" })).toContainText("Luke 9:23");

  // Leave immediately after typing: the pending edit must still be saved.
  await page.getByRole("textbox", { name: "Analysis notes" }).fill("Typed just before leaving");
  await page.locator("main").getByRole("link", { name: "My Library" }).click();

  // Resume from the library, where it reopens at the last section with every edit.
  const item = libraryItem(page, "Taking up the cross");
  await expect(item).toContainText("Left off at4. Analysis");
  await item.getByRole("link", { name: /^Resume/ }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Analysis" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Analysis notes" })).toHaveValue("Typed just before leaving");
  await expect(page.getByRole("textbox", { name: "Claim 1" })).toHaveValue("Discipleship is described as daily.");

  // Conclude.
  await goToSection(page, "Conclusion");
  await page.getByRole("textbox", { name: /What I understand now/ }).fill("Taking up the cross is a daily choice.");
  await page.locator("label").filter({ has: page.locator('input[value="concluded"]') }).click();
  await expectSaved(page);
  await page.reload();
  await expect(page.locator("main header").getByText("Concluded")).toBeVisible();
  await expect(page.getByRole("textbox", { name: /What I understand now/ })).toHaveValue(
    "Taking up the cross is a daily choice.",
  );

  // Reopen from the library and keep working: concluded investigations stay editable.
  await page.goto("/library");
  await page.getByRole("combobox", { name: "Status" }).selectOption("concluded");
  await libraryItem(page, "Taking up the cross").getByRole("link", { name: /^Reopen/ }).click();
  await page.getByRole("textbox", { name: "Remaining questions" }).fill("How does this apply to my family?");
  await page.locator("label").filter({ has: page.locator('input[value="investigating"]') }).click();
  await expectSaved(page);

  await page.goto("/library");
  await expect(libraryItem(page, "Taking up the cross")).toContainText("Investigating");
});

test("start from a curated question and keep editing after the first save", async ({ page }) => {
  await page.goto("/questions/meaningful-prayer");
  await page.getByRole("link", { name: "Start a research notebook" }).click();
  const question = "What makes prayer meaningful rather than routine?";
  await expect(page.getByRole("textbox", { name: "Question", exact: true })).toHaveValue(question);

  await page.getByRole("textbox", { name: "Context" }).fill("My prayers feel repetitive.");
  await expectSaved(page);
  await expect(page).toHaveURL(/\/investigations\/view\?id=/);

  // The editor must not reset when its address changes after the first save.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(question);
  await expect(page.getByRole("textbox", { name: "Context" })).toHaveValue("My prayers feel repetitive.");
  await page.getByRole("textbox", { name: "Context" }).fill("My prayers feel repetitive. I want that to change.");
  await expectSaved(page);

  // Suggested references from the question bank are offered as starting points.
  await goToSection(page, "Research");
  await page.getByRole("button", { name: "Record evidence from James 1:5–6" }).click();
  await expect(page.getByRole("textbox", { name: "Source title or reference" })).toHaveValue("James 1:5–6");
  await expect(page.getByRole("textbox", { name: "Observation" })).toHaveValue("");

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(question);
  await goToSection(page, "Question");
  await expect(page.getByRole("textbox", { name: "Context" })).toHaveValue(
    "My prayers feel repetitive. I want that to change.",
  );
});

test("delete asks for confirmation", async ({ page }) => {
  await createInvestigation(page, "Short-lived");
  await page.goto("/library");
  const item = libraryItem(page, "Short-lived");

  await item.getByRole("button", { name: "Delete Short-lived" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete this research notebook?" });
  await expect(dialog).toContainText("1 evidence card");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(item).toBeVisible();

  await item.getByRole("button", { name: "Delete Short-lived" }).click();
  await dialog.getByRole("button", { name: "Delete notebook" }).click();
  await expect(page.getByText("No research notebooks yet")).toBeVisible();
});

test("an untouched draft is not saved", async ({ page }) => {
  await page.goto("/investigations/new?question=meaningful-prayer");
  await expect(page.getByRole("textbox", { name: "Question", exact: true })).toHaveValue(
    "What makes prayer meaningful rather than routine?",
  );
  await page.goto("/library");
  await expect(page.getByText("No research notebooks yet")).toBeVisible();
});
