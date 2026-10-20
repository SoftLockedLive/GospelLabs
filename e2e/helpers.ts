import { expect, type Page } from "@playwright/test";

export const sections = (page: Page) => page.getByRole("navigation", { name: "Investigation sections" });

export async function goToSection(page: Page, name: string) {
  await sections(page).getByRole("button", { name: new RegExp(name) }).click();
  await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();
}

export async function expectSaved(page: Page) {
  await expect(page.getByText("Saved on this device").filter({ visible: true })).toBeVisible();
}

/** Creates and saves a small investigation with one piece of evidence. Returns its URL. */
export async function createInvestigation(page: Page, title: string): Promise<string> {
  await page.goto("/investigations/new");
  await page.getByRole("textbox", { name: "Question", exact: true }).fill(`What can I learn about ${title}?`);
  await page.getByRole("textbox", { name: "Title" }).fill(title);
  await expectSaved(page);
  await expect(page).toHaveURL(/\/investigations\/view\?id=/);

  await goToSection(page, "Research");
  await page.getByRole("button", { name: "Add evidence", exact: true }).first().click();
  await page.getByRole("textbox", { name: "Source title or reference" }).fill("Luke 9:23");
  await page.getByRole("textbox", { name: "Observation" }).fill("Following Christ is described as a daily choice.");
  await page.locator("form").getByRole("button", { name: "Add evidence" }).click();
  await expectSaved(page);
  return page.url();
}

/** The item for an investigation in My Library. */
export const libraryItem = (page: Page, title: string) =>
  page.getByRole("article").filter({ has: page.getByRole("heading", { name: title, exact: true }) });
