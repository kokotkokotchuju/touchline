import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("match browsing, status, search, dates, and time zones", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Every match. One place." }),
  ).toBeVisible();
  await expect(page.locator(".match-row")).toHaveCount(12);
  const homeScore = await page.locator(".home-score").first().boundingBox();
  const awayScore = await page.locator(".away-score").first().boundingBox();
  if (page.viewportSize()!.width < 460) {
    expect(awayScore!.y).toBeGreaterThan(homeScore!.y + 15);
  } else {
    expect(awayScore!.x).toBeGreaterThan(homeScore!.x + 15);
  }
  await page
    .getByRole("group", { name: "Match status", exact: true })
    .getByRole("button", { name: /^Live/ })
    .click();
  await expect(page.locator(".match-row")).toHaveCount(3);
  await page
    .getByRole("group", { name: "Match status", exact: true })
    .getByRole("button", { name: "All matches" })
    .click();
  await page.getByRole("textbox", { name: "Search matches" }).fill("Arsenal");
  await expect(page.locator(".match-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.getByLabel("Filter competition").selectOption("premier-league");
  await expect(page.locator(".match-row")).toHaveCount(3);
  await page.getByLabel("Filter competition").selectOption("");
  await page.getByRole("button", { name: "Next day", exact: true }).click();
  await expect(page.locator(".match-is-live")).toHaveCount(0);
  await page.getByRole("button", { name: "Back to today" }).click();
  await page
    .getByLabel("Time zone", { exact: true })
    .selectOption("Europe/Bratislava");
  await expect(page.getByText("Times in Bratislava")).toBeVisible();
  await expect(page.locator(".match-row")).toHaveCount(12);
  expect(errors).toEqual([]);
});

test("saved matches survive reload and match dialog supports Escape", async ({
  page,
}) => {
  await page.goto("/");
  const save = page.getByRole("button", {
    name: "Save Arsenal versus Chelsea",
    exact: true,
  });
  await save.click();
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Unsave Arsenal versus Chelsea",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Show saved matches only" }).click();
  await expect(page.locator(".match-row")).toHaveCount(1);
  await page
    .getByRole("button", {
      name: "Arsenal versus Chelsea, live, 3 to 0, match overview",
    })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: /Saved/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your saved matches" }),
  ).toBeVisible();
  await expect(page.locator(".match-row")).toHaveCount(1);
});

test("competition catalogue filters and opens database competition pages", async ({
  page,
}) => {
  await page.goto("/competitions");
  await expect(page.locator(".cc-competition-card")).toHaveCount(4);
  await page
    .getByRole("combobox", { name: "Competition type" })
    .selectOption("cup");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator(".cc-competition-card")).toHaveCount(1);
  await page
    .getByRole("combobox", { name: "Competition type" })
    .selectOption("all");
  await page
    .getByRole("searchbox", { name: "Search competitions" })
    .fill("England");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator(".cc-competition-card")).toHaveCount(2);
  await page
    .locator(".cc-competition-card")
    .filter({ hasText: "Premier League" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sample Premier League",
  );
  await expect(page.locator(".cc-standings tbody tr")).toHaveCount(4);
});

test("empty states recover, broken storage is safe, and pages fit the viewport", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("touchline:saved-matches:v1", "broken-json"),
  );
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Search matches" })
    .fill("a team that does not exist");
  await expect(
    page.getByRole("heading", { name: "No matches found" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show today’s matches" }).click();
  await expect(page.locator(".match-row")).toHaveCount(12);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/not-a-page");
  await expect(
    page.getByRole("heading", { name: "This page is off the pitch." }),
  ).toBeVisible();
  const response = await page.goto("/design-system");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "This page is off the pitch." }),
  ).toBeVisible();
});

test("accessibility: match centre, match overview, and competition directory", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".match-row")).toHaveCount(12);
  const scan = async () =>
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => ({
        target: node.target,
        summary: node.failureSummary,
      })),
    }));
  expect(await scan()).toEqual([]);
  await page.locator(".match-row-main").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await scan()).toEqual([]);
  await page.keyboard.press("Escape");
  await page.goto("/competitions");
  expect(await scan()).toEqual([]);
});
