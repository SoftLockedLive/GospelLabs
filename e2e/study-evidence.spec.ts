/**
 * The evidence stays in view while answering, so nobody has to scroll up to the verses and back down to the
 * question: pinned under the study bar on phones and tablets, and in a column beside the step on wide screens.
 */
import { expect, test } from "@playwright/test";
import { checkButton, pathSteps, solveStep, startInvestigation, stepArticle } from "./study-helpers";

test("the evidence and the question are on screen together", async ({ page }, testInfo) => {
  // Fear and Friendship's first step sorts statements using eleven sources.
  const inv = await startInvestigation(page, "fear-god-friend", { difficulty: "easy", length: "quick" });
  const [first, second] = pathSteps(inv, "quick");
  const article = stepArticle(page, first);

  if (testInfo.project.name === "mobile") {
    const dock = article.getByRole("region", { name: "Evidence" });
    const toggle = dock.getByRole("button", { name: /^Evidence \(\d+\)/ });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    // Scrolled down to answer: the study bar and the evidence are still pinned at the top, and Check is on screen too.
    await checkButton(article).scrollIntoViewIfNeeded();
    await expect(checkButton(article)).toBeInViewport();
    await expect(page.getByRole("button", { name: "Overview" })).toBeInViewport();
    await expect(dock.getByRole("heading").first()).toBeInViewport();
    const box = await dock.boundingBox();
    expect(box!.y).toBeLessThan(120);

    // It stays open on the next step.
    await solveStep(page, first, "easy");
    const next = stepArticle(page, second).getByRole("region", { name: "Evidence" });
    await expect(next.getByRole("button", { name: /^Evidence \(\d+\)/ })).toHaveAttribute("aria-expanded", "true");
  } else {
    // Wide screens: a column beside the step, still in view after scrolling down to Check.
    const aside = article.getByRole("complementary", { name: "Evidence" });
    await expect(aside).toBeVisible();
    await expect(article.getByRole("region", { name: "Evidence" })).toBeHidden();
    await checkButton(article).scrollIntoViewIfNeeded();
    await expect(checkButton(article)).toBeInViewport();
    await expect(aside.getByRole("heading").nth(1)).toBeInViewport();
  }
});
