import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { addEvidence, createInvestigation, expectSaved, goToSection, openActivity } from "./helpers";

const connectionsArea = (page: Page) => page.getByRole("region", { name: /^Evidence connections/ });
const connectionForm = (page: Page) => page.getByRole("form", { name: "New connection" });

test("connect evidence, edit and delete connections, and keep them consistent", async ({ page }, testInfo) => {
  await createInvestigation(page, "Daily discipleship"); // E1: Luke 9:23
  const area = connectionsArea(page);
  const form = connectionForm(page);
  await openActivity(page, "Connections");
  await expect(area).toContainText("Add one more piece of evidence");
  await expect(area.getByRole("button", { name: "Create connection" })).toHaveCount(0);

  await addEvidence(page, "Mark 8:34", "Whosoever will come after me, let him deny himself.");
  await addEvidence(page, "Alma 37:37", "Counsel with the Lord in all thy doings.");
  await openActivity(page, "Connections");
  await expect(area).toContainText("No connections yet");

  // Create: nothing is preselected, so the form asks for each choice.
  await area.getByRole("button", { name: "Create connection" }).click();
  await form.getByRole("button", { name: "Create connection" }).click();
  await expect(form).toContainText("Choose the first piece of evidence.");
  await expect(form).toContainText("Choose how they relate.");
  await form.getByRole("combobox", { name: "First piece of evidence" }).selectOption({ label: "E1 · Luke 9:23" });
  await form.locator("label").filter({ hasText: "Supports" }).click();
  await form.getByRole("combobox", { name: "Second piece of evidence" }).selectOption({ label: "E2 · Mark 8:34" });
  await expect(form).toContainText("Reads as: E1 Luke 9:23 supports E2 Mark 8:34");
  await form.getByRole("textbox", { name: "Explanation" }).fill("Both describe following Him daily.");
  // Focus stays where the user is working; the form doesn't pull it back to the first field.
  await expect(form.getByRole("textbox", { name: "Explanation" })).toBeFocused();
  await form.getByRole("button", { name: "Create connection" }).click();

  const list = area.getByRole("list", { name: "Connections" });
  const created = list.getByRole("article", { name: "E1 Luke 9:23 supports E2 Mark 8:34" });
  await expect(created).toBeFocused();
  await expect(created).toContainText("Both describe following Him daily.");
  await expectSaved(page);

  // The same pair can't be connected twice, in either direction.
  await area.getByRole("button", { name: "Create connection" }).click();
  await form.getByRole("combobox", { name: "First piece of evidence" }).selectOption({ label: "E2 · Mark 8:34" });
  await expect(form.getByRole("option", { name: "E1 · Luke 9:23 (already connected)" })).toBeDisabled();
  await form.getByRole("button", { name: "Cancel" }).click();
  await expect(area.getByRole("button", { name: "Create connection" })).toBeFocused();

  // Start from an evidence card: it becomes the first card, and Connections opens.
  await openActivity(page, "Evidence");
  await page.getByRole("button", { name: "Connect E3: Alma 37:37 to other evidence" }).click();
  await expect(page.getByRole("tab", { name: /^Connections/ })).toHaveAttribute("aria-selected", "true");
  await expect(form.getByRole("combobox", { name: "First piece of evidence" }).locator("option:checked")).toHaveText(
    "E3 · Alma 37:37",
  );
  await expect(form.getByRole("combobox", { name: "Second piece of evidence" })).toBeFocused();
  await form.locator("label").filter({ hasText: "Raises a question" }).click();
  await form.getByRole("combobox", { name: "Second piece of evidence" }).selectOption({ label: "E1 · Luke 9:23" });
  await form.getByRole("button", { name: "Create connection" }).click();
  await expect(list.getByRole("article", { name: "E3 Alma 37:37 raises a question about E1 Luke 9:23" })).toBeVisible();
  await openActivity(page, "Evidence");
  await expect(page.getByRole("article", { name: "Luke 9:23", exact: true })).toContainText("In 2 connections");
  await openActivity(page, "Connections");

  // Edit in place: relationship, direction, and explanation are saved as they change.
  const item = list.getByRole("listitem").first();
  await item.getByRole("button", { name: /^Edit connection/ }).click();
  await item.locator("label").filter({ hasText: "Challenges" }).click();
  await item.getByRole("button", { name: "Swap direction" }).click();
  await item.getByRole("textbox", { name: "Explanation" }).fill("Self-denial can seem at odds with joy.");
  await item.getByRole("button", { name: "Done" }).click();
  await expect(item.getByRole("button", { name: /^Edit connection/ })).toBeFocused();
  await expect(item.getByRole("article")).toHaveAccessibleName("E2 Mark 8:34 challenges E1 Luke 9:23");
  await expectSaved(page);

  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "Research" })).toBeVisible();
  await expect(list.getByRole("article", { name: "E2 Mark 8:34 challenges E1 Luke 9:23" })).toContainText(
    "Self-denial can seem at odds with joy.",
  );

  // A connection opens its evidence cards, switching to Evidence.
  await item.getByRole("button", { name: "Open E2, Scripture: Mark 8:34" }).click();
  await expect(page.getByRole("article", { name: "Mark 8:34", exact: true })).toBeFocused();
  await expect(page.getByRole("tab", { name: /^Evidence/ })).toHaveAttribute("aria-selected", "true");

  // Deleting evidence removes its connections; Undo brings everything back.
  await page.getByRole("button", { name: "Delete E1: Luke 9:23" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Evidence and 2 connections removed" })).toBeVisible();
  await openActivity(page, "Connections");
  await expect(area).toContainText("No connections yet");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(list.getByRole("listitem")).toHaveCount(2);

  // Deleting a connection can be undone too.
  await list.getByRole("button", { name: /^Delete connection: E3/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Connection removed" })).toBeVisible();
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await expectSaved(page);

  // Backups include connections.
  await page.goto("/settings/data");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export backup" }).click(),
  ]);
  const path = testInfo.outputPath("backup.json");
  await download.saveAs(path);
  const { investigations } = JSON.parse(readFileSync(path, "utf8"));
  expect(investigations[0].evidenceConnections.map((c: { relationship: string }) => c.relationship)).toEqual([
    "challenges",
    "raises-question",
  ]);
});

test("a new investigation explains that connections need two pieces of evidence", async ({ page }) => {
  await page.goto("/investigations/new");
  await goToSection(page, "Research");
  await openActivity(page, "Connections");
  await expect(connectionsArea(page)).toContainText("Add at least two pieces of evidence");
  await expect(connectionsArea(page).getByRole("button", { name: "Create connection" })).toHaveCount(0);
});
