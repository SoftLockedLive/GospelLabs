/**
 * Every study-tool card on the dashboard opens its page when tapped anywhere
 * on the card, not only on its title. Guards the 2.0 bug where the Connect
 * with Christ card's link only covered its heading.
 */
import { expect, test } from "@playwright/test";

const CARDS = [
  { name: "Connect with Christ", path: "/connect", tap: "Nothing to finish, nothing scored" },
  { name: "Connect with Christ (today's session)", path: "/connect", tap: /^Today · / },
  { name: "Scripture Explorer", path: "/explore", tap: "Read a passage closely" },
  { name: "Character of Christ", path: "/character", tap: "Study an attribute of the Savior" },
] as const;

for (const card of CARDS) {
  test(`tapping the ${card.name} card away from its title opens ${card.path}`, async ({ page }) => {
    await page.goto("/");
    const target = page.getByText(card.tap).first();
    await expect(target).toBeVisible();
    await target.scrollIntoViewIfNeeded();
    // Tap where the text is, as a person would: the card's link covers the whole card, so the tap lands on it.
    const box = await target.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect(page).toHaveURL(new RegExp(`${card.path}$`));
  });
}

test("someone with only a few minutes is offered Connect with Christ near the top of the dashboard", async ({ page }) => {
  await page.goto("/");
  const fewMinutes = page.getByRole("link", { name: /^Only a few minutes\?/ });
  await expect(fewMinutes).toBeVisible();
  // On a phone it's on the first screen, before any scrolling.
  const box = await fewMinutes.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await fewMinutes.click();
  await expect(page).toHaveURL(/\/connect$/);
});
