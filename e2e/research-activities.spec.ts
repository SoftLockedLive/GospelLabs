import { expect, test } from "@playwright/test";
import { createInvestigation, expectSaved, goToSection, openActivity } from "./helpers";

test("Research activities keep unsaved input, show counts, work from the keyboard, and are remembered", async ({ page }) => {
  await createInvestigation(page, "Activities"); // one evidence card, Evidence shown
  const tabs = page.getByRole("tablist", { name: "Research activities" });
  await expect(tabs.getByRole("tab")).toHaveCount(3); // no Discover without a trail
  await expect(tabs.getByRole("tab", { name: "Evidence, 1 card" })).toHaveAttribute("aria-selected", "true");
  await expect(tabs.getByRole("tab", { name: "Connections, 0 connections" })).toBeVisible();

  // Start a new card, switch away, write a challenge response, and come back: the draft is still there.
  await page.getByRole("button", { name: "Add evidence", exact: true }).first().click();
  await page.getByRole("textbox", { name: "Source title or reference" }).fill("Moroni 7:41");
  await openActivity(page, "Challenges");
  await expect(page.getByRole("textbox", { name: "Source title or reference" })).toBeHidden();
  await page.getByRole("textbox", { name: "Your response" }).fill("Hope looks forward.");
  await expectSaved(page);
  await expect(tabs.getByRole("tab", { name: "Challenges, 1 response" })).toBeVisible();
  await openActivity(page, "Evidence");
  await expect(page.getByRole("textbox", { name: "Source title or reference" })).toHaveValue("Moroni 7:41");
  await page.getByRole("textbox", { name: "Observation" }).fill("Hope through the Atonement.");
  await page.locator("form").getByRole("button", { name: "Add evidence" }).click();
  await expect(tabs.getByRole("tab", { name: "Evidence, 2 cards" })).toBeVisible();

  // Arrow keys, Home, and End move between activities and select them.
  await tabs.getByRole("tab", { name: /^Evidence/ }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.getByRole("tab", { name: /^Connections/ })).toBeFocused();
  await expect(tabs.getByRole("tab", { name: /^Connections/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("region", { name: /^Evidence connections/ })).toBeVisible();
  await page.keyboard.press("Home");
  await expect(tabs.getByRole("tab", { name: /^Challenges/ })).toBeFocused();
  await page.keyboard.press("End");
  await expect(tabs.getByRole("tab", { name: /^Connections/ })).toBeFocused();
  await expectSaved(page);

  // The last activity is remembered with the investigation.
  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "Research" })).toBeVisible();
  await expect(tabs.getByRole("tab", { name: /^Connections/ })).toHaveAttribute("aria-selected", "true");
  await goToSection(page, "Analysis");
  await goToSection(page, "Research");
  await expect(tabs.getByRole("tab", { name: /^Connections/ })).toHaveAttribute("aria-selected", "true");
});
