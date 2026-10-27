import { expect, type Page } from "@playwright/test";

export const sections = (page: Page) => page.getByRole("navigation", { name: "Notebook sections" });

export async function goToSection(page: Page, name: string) {
  await sections(page).getByRole("button", { name: new RegExp(name) }).click();
  await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();
}

/** Shows a Research activity: "Discover", "Challenges", "Evidence", or "Connections". */
export async function openActivity(page: Page, name: string) {
  const tab = page.getByRole("tab", { name: new RegExp(`^${name}`) });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
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
  await openActivity(page, "Evidence");
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

/** Adds an evidence card in Research. */
export async function addEvidence(page: Page, title: string, observation: string) {
  await openActivity(page, "Evidence");
  await page.getByRole("button", { name: "Add evidence", exact: true }).first().click();
  await page.getByRole("textbox", { name: "Source title or reference" }).fill(title);
  await page.getByRole("textbox", { name: "Observation" }).fill(observation);
  await page.locator("form").getByRole("button", { name: "Add evidence" }).click();
}

/**
 * Stores a record directly in the app's IndexedDB, exactly as given (for
 * example, as an older version saved it). Open a page of the app first so
 * the database exists.
 */
export function putRawRecord(page: Page, record: object) {
  return page.evaluate(
    (value) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("gospel-labs");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const transaction = request.result.transaction("investigations", "readwrite");
          transaction.objectStore("investigations").put(value);
          transaction.oncomplete = () => {
            request.result.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    record,
  );
}

/** Reads a stored record directly from IndexedDB, without the app's validation. */
export function getRawRecord(page: Page, id: string) {
  return page.evaluate(
    (key) =>
      new Promise<Record<string, unknown>>((resolve, reject) => {
        const request = indexedDB.open("gospel-labs");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const get = request.result.transaction("investigations").objectStore("investigations").get(key);
          get.onsuccess = () => {
            request.result.close();
            resolve(get.result);
          };
        };
      }),
    id,
  );
}
