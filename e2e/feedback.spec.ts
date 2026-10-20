import { expect, test } from "@playwright/test";

test("settings offers bug reports and idea suggestions by email", async ({ page }) => {
  await page.goto("/settings");
  const section = page.getByRole("region", { name: "Feedback" });
  await expect(section.getByRole("link", { name: "gospellabs@proton.me" })).toHaveAttribute(
    "href",
    "mailto:gospellabs@proton.me",
  );
  await expect(section.getByRole("link", { name: "Report a bug" })).toHaveAttribute(
    "href",
    /^mailto:gospellabs@proton\.me\?subject=Gospel%20Labs%20bug%20report&body=/,
  );
  await expect(section.getByRole("link", { name: "Suggest an idea" })).toHaveAttribute(
    "href",
    /^mailto:gospellabs@proton\.me\?subject=Gospel%20Labs%20idea&body=/,
  );
});
