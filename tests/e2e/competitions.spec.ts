import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const league = "/competition/demo-premier-league";
const continental = "/competition/demo-continental-cup";
test("league sections preserve season scope and display complete standings", async ({
  page,
}) => {
  await page.goto(league);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sample Premier League",
  );
  const sections = page.getByRole("navigation", {
    name: "Competition sections",
  });
  await sections.getByRole("link", { name: "Standings", exact: true }).click();
  await expect(page.locator(".cc-standings thead th")).toHaveText([
    "Position",
    "Team",
    "Played",
    "Won",
    "Drawn",
    "Lost",
    "Goals for",
    "Goals against",
    "Goal difference",
    "Points",
    "Form",
  ]);
  await expect(page.locator(".cc-standings tbody tr")).toHaveCount(4);
  await expect(page.locator(".cc-table-notes")).toContainText(
    "-3 points adjustment, already included",
  );
  await expect(
    page
      .locator(".cc-standings tbody tr")
      .filter({ hasText: "Summit" })
      .locator(".cc-points"),
  ).toHaveText("-2*");
  await expect(
    page.locator(".cc-form").first().getByRole("list"),
  ).toHaveAttribute("aria-label", "Recent form, oldest to newest");
  await page
    .getByRole("combobox", { name: "Season", exact: true })
    .selectOption("2025-26");
  await expect(page).toHaveURL(/\/season\/2025-26\/standings/);
  await expect(page.locator(".cc-standings tbody tr")).toHaveCount(2);
  await sections.getByRole("link", { name: "Statistics", exact: true }).click();
  await expect(page.locator(".cc-leaderboard").first()).toContainText(
    "Sample harbour player 13",
  );
  await expect(page.locator(".cc-leaderboard").first().locator("b")).toHaveText(
    "4",
  );
  await page
    .getByRole("combobox", { name: "Season", exact: true })
    .selectOption("2026-27");
  await expect(
    page.locator(".cc-leaderboard").first().locator("li"),
  ).toHaveCount(8);
  await expect(page.locator(".cc-team-metrics")).toContainText("56.4%");
  await expect(
    page
      .locator(".cc-team-metrics article")
      .filter({ hasText: "Riverside" })
      .filter({ hasText: "Expected goals" })
      .locator("strong"),
  ).toHaveText("—");
  await sections.getByRole("link", { name: "Matches", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Competition match filters" })
    .getByRole("link", { name: /Fixtures/ })
    .click();
  await expect(page.locator(".mc-match")).toHaveCount(2);
  await expect(page.locator(".mc-match").last()).toContainText("Time TBC");
  await page.reload();
  await expect(page.getByRole("link", { name: /Fixtures/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page
    .getByRole("navigation", { name: "Competition match filters" })
    .getByRole("link", { name: /Results/ })
    .click();
  await expect(page.locator(".mc-match")).toHaveCount(1);
  await page.locator(".mc-match").first().click();
  await expect(page).toHaveURL(/\/match\//);
  await expect(page.locator(".mc-scoreboard-status")).toHaveText("Full time");
});

test("group and knockout views preserve grouping, progression and shootouts", async ({
  page,
}) => {
  await page.goto(`${continental}/standings`);
  await expect(page.locator(".cc-standings")).toHaveCount(2);
  await expect(page.locator(".cc-tie")).toHaveCount(2);
  await expect(
    page
      .locator(".cc-table-panel")
      .filter({ hasText: "Group B" })
      .locator("tbody tr > td:first-child"),
  ).toHaveText(["1", "1"]);
  await page
    .getByRole("combobox", { name: "Stage", exact: true })
    .selectOption("group-stage");
  await page
    .getByRole("combobox", { name: "Group", exact: true })
    .selectOption("a");
  await expect(page.locator(".cc-standings")).toHaveCount(1);
  await expect(page.locator(".cc-tie")).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Competition sections" })
    .getByRole("link", { name: "Statistics", exact: true })
    .click();
  await expect(page.locator(".cc-team-metrics article")).toHaveCount(2);
  await expect(page).toHaveURL(/stage=group-stage&group=a/);
  await page
    .getByRole("combobox", { name: "Stage", exact: true })
    .selectOption("knockout");
  await expect(page).not.toHaveURL(/group=/);
  await page
    .getByRole("navigation", { name: "Competition sections" })
    .getByRole("link", { name: "Standings", exact: true })
    .click();
  await expect(page.locator(".cc-standings")).toHaveCount(0);
  await expect(page.locator(".cc-tie")).toHaveCount(2);
  await expect(
    page.locator(".cc-tie").first().locator(".cc-tie-team > strong"),
  ).toHaveText(["3", "2"]);
  await page
    .getByRole("link", { name: "Winner to Final, tie 1", exact: true })
    .click();
  await expect(page).toHaveURL(/#tie-/);
  await page.goto("/competition/demo-domestic-cup/standings");
  await expect(page.locator(".cc-standings")).toHaveCount(0);
  await expect(page.locator(".cc-tie-team > strong")).toHaveText(["1", "1"]);
  await expect(page.locator(".cc-legs")).toContainText("Penalties 5–4");
  await expect(page.locator(".cc-winner")).toContainText("Harbour");
});

test("competition selections return true 404s and APIs reject invalid queries", async ({
  page,
  request,
}) => {
  for (const path of [
    `${league}/season/1999-00`,
    `${league}/squad`,
    `${league}/standings?stage=missing`,
    `${continental}/standings?stage=knockout&group=a`,
    "/competition/missing",
    `${league}?page=0`,
  ]) {
    expect((await page.goto(path))?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "This page is off the pitch." }),
    ).toBeVisible();
  }
  expect(
    (
      await request.get(
        "/api/v1/competitions/demo-premier-league?section=stats&section=matches",
      )
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.get(
        "/api/v1/competitions/demo-premier-league?season=1999-00",
      )
    ).status(),
  ).toBe(404);
  await page.goto("/competitions?q=no-such-competition");
  await expect(
    page.getByRole("heading", { name: "No competitions found" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View all competitions" }).click();
  await expect(page.locator(".cc-competition-card")).toHaveCount(4);
});

test("competition tables, sections and knockout rounds are accessible and fit the viewport", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of [
    "/competitions",
    league,
    `${league}/standings`,
    `${league}/matches`,
    `${league}/stats`,
    `${continental}/standings`,
  ]) {
    await page.goto(path);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      scan.violations.map((item) => ({
        id: item.id,
        targets: item.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
  }
  await page.goto(`${league}/standings`);
  const scroll = page.getByRole("region", {
    name: /standings, scroll horizontally/,
  });
  await scroll.focus();
  await expect(scroll).toBeFocused();
  if (page.viewportSize()!.width < 970) {
    await page.keyboard.press("End");
    await expect
      .poll(() => scroll.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
});
