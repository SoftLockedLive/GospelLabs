import { expect, test, type Page } from "@playwright/test";
import { RECORD_FROM_1_0 } from "../src/persistence/legacy-fixtures";
import { createInvestigation, expectSaved, goToSection } from "./helpers";

const challengePanel = (page: Page) => page.getByRole("region", { name: "Research challenge" });

test("respond to challenges, try another, revisit, edit, and undo a deletion", async ({ page }) => {
  await createInvestigation(page, "Challenges");
  const panel = challengePanel(page);
  const title = panel.getByRole("heading", { level: 4 });
  const response = panel.getByRole("textbox", { name: "Your response" });

  // Respond to the first challenge, then move on to another.
  const firstTitle = (await title.textContent())!;
  await response.fill("Something I noticed.");
  await expectSaved(page);
  await expect(panel).toContainText("1 response so far");
  await panel.getByRole("button", { name: "Another challenge" }).click();
  await expect(title).not.toHaveText(firstTitle);
  await expect(response).toHaveValue("");

  // Choose a type, and respond to that kind of challenge.
  await panel.locator("label").filter({ has: page.getByRole("radio", { name: /^Apply/ }) }).click();
  await expect(panel.locator("[aria-live]")).toContainText("Apply");
  await response.fill("A principle I could act on.");
  await expectSaved(page);
  await expect(panel.getByRole("radio", { name: "Apply, 1 response" })).toBeChecked();

  // Responses survive a reload and can be reopened and edited.
  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "Research" })).toBeVisible();
  await panel.getByText("Your responses (2)").click();
  const list = panel.getByRole("list", { name: "Your challenge responses" });
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await list.getByRole("button", { name: `Edit your response to “${firstTitle}”` }).click();
  await expect(title).toHaveText(firstTitle);
  await expect(response).toBeFocused();
  await expect(response).toHaveValue("Something I noticed.");
  await response.fill("Something I noticed, and more.");
  await expectSaved(page);
  await page.reload();
  await panel.getByText("Your responses (2)").click();
  await expect(list).toContainText("Something I noticed, and more.");

  // Deleting a response can be undone.
  await list.getByRole("button", { name: `Delete your response to “${firstTitle}”` }).click();
  await expect(page.getByRole("status").filter({ hasText: "Challenge response removed" })).toBeVisible();
  await expect(panel).toContainText("1 response so far");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(panel).toContainText("2 responses so far");
  await expectSaved(page);
});

test("an investigation saved by Gospel Labs 1.0 opens unchanged and accepts challenge responses", async ({ page }) => {
  // Let the app create its database, then store a record exactly as 1.0 wrote it.
  await page.goto("/library");
  await expect(page.getByText("No investigations yet")).toBeVisible();
  await page.evaluate(
    (record) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("gospel-labs");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const transaction = request.result.transaction("investigations", "readwrite");
          transaction.objectStore("investigations").put(record);
          transaction.oncomplete = () => {
            request.result.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    RECORD_FROM_1_0,
  );

  await page.goto(`/investigations/view?id=${RECORD_FROM_1_0.id}`);
  await expect(page.getByRole("heading", { level: 2, name: "Analysis" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Analysis notes" })).toHaveValue("Daily, not once.");

  await goToSection(page, "Research");
  await expect(page.getByText("Jesus says to take up the cross daily.").filter({ visible: true })).toBeVisible();
  await challengePanel(page).getByRole("textbox", { name: "Your response" }).fill("Daily stands out.");
  await expectSaved(page);

  const stored = await page.evaluate(
    (id) =>
      new Promise<Record<string, unknown>>((resolve, reject) => {
        const request = indexedDB.open("gospel-labs");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const get = request.result.transaction("investigations").objectStore("investigations").get(id);
          get.onsuccess = () => {
            request.result.close();
            resolve(get.result);
          };
        };
      }),
    RECORD_FROM_1_0.id,
  );
  // Everything 1.0 wrote is still there; only the response, the section, and the edit time are new.
  expect(stored).toEqual({
    ...RECORD_FROM_1_0,
    currentSection: "research",
    updatedAt: expect.not.stringMatching(RECORD_FROM_1_0.updatedAt),
    challengeResponses: [expect.objectContaining({ response: "Daily stands out." })],
  });
});
