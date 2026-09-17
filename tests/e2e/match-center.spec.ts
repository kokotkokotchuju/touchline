import { test, expect, type APIRequestContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { MatchCenterPage } from "../../src/lib/football/match-center";

async function list(request: APIRequestContext, date = "2026-09-15") {
  const response = await request.get(`/api/v1/matches?date=${date}`);
  expect(response.status()).toBe(200);
  return response.json() as Promise<MatchCenterPage>;
}
test("database match browsing preserves date and combined filters", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/matches/2026-09-15");
  await expect(
    page.getByRole("heading", { name: "A whole world of football." }),
  ).toBeVisible();
  await expect(page.locator(".mc-country-groups .mc-match")).toHaveCount(4);
  await page
    .getByRole("group", { name: "Filter match status" })
    .getByRole("button", { name: "Live", exact: true })
    .click();
  await expect(page.locator(".mc-country-groups .mc-match")).toHaveCount(2);
  await expect(
    page.locator(".mc-country-groups").getByText("Half-time", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await page.getByLabel("Choose match date").fill("2026-09-16");
  await expect(page).toHaveURL(/\/matches\/2026-09-16/);
  await page.getByRole("button", { name: "Upcoming", exact: true }).click();
  await expect(page.locator(".mc-country-groups .mc-match")).toHaveCount(2);
  await expect(
    page.getByRole("heading", { name: "International", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Country", exact: true })
    .selectOption("england");
  await page
    .getByRole("combobox", { name: "Competition", exact: true })
    .selectOption("demo-nations-cup");
  await expect(
    page.getByRole("heading", { name: "No matches found" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Kickoff time zone", exact: true })
    .selectOption("Europe/Bratislava");
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page.locator(".mc-country-groups .mc-match")).toHaveCount(2);
  await expect(page.getByLabel("Choose match date")).toHaveValue("2026-09-16");
  await expect(
    page.getByRole("combobox", { name: "Kickoff time zone", exact: true }),
  ).toHaveValue("Europe/Bratislava");
  await expect(page.locator(".mc-time-note")).toContainText(
    "Dates use UTC days",
  );
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Kickoff time zone", exact: true }),
  ).toHaveValue("Europe/Bratislava");
  await page.getByRole("button", { name: "Previous day", exact: true }).click();
  await expect(page.getByLabel("Choose match date")).toHaveValue("2026-09-15");
  await page.getByRole("button", { name: "Yesterday", exact: true }).click();
  const yesterday = new Date(Date.now() - 86_400_000)
    .toISOString()
    .slice(0, 10);
  await expect(page.getByLabel("Choose match date")).toHaveValue(yesterday);
  expect(errors).toEqual([]);
});

test("match details show timeline roles, lineups, unknown stats and prior meetings", async ({
  page,
  request,
}) => {
  const match = (await list(request)).data.find(
    (match) => match.status === "live",
  )!;
  await page.goto(match.href);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    `${match.home.name} vs ${match.away.name}`,
  );
  await expect(page.locator(".mc-event")).toHaveCount(8);
  await expect(page.getByText("45+2′", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Assist · Sample harbour player 7", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".mc-event-removed")).toContainText("Disallowed");
  await expect(
    page.locator(".mc-event-card").filter({ hasText: "Substitution" }),
  ).toContainText("Sample harbour player 12");
  await expect(
    page.locator(".mc-event-card").filter({ hasText: "Substitution" }),
  ).toContainText("Sample harbour player 9");
  await page.getByRole("tab", { name: "Lineups", exact: true }).click();
  await expect(
    page.getByRole("tabpanel", { name: "Lineups", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".mc-lineup-list li")).toHaveCount(26);
  await expect(page.getByText("4-3-3", { exact: true })).toHaveCount(2);
  await expect(page.locator(".mc-pitch-player")).toHaveCount(22);
  await page.getByRole("tab", { name: "Statistics", exact: true }).click();
  await expect(
    page.getByText("Partial statistics coverage.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.locator(".mc-statistics > div").filter({ hasText: "Expected goals" }),
  ).toContainText("—");
  await expect(
    page.locator(".mc-statistics > div").filter({ hasText: "Possession" }),
  ).toContainText("58%");
  await page.getByRole("tab", { name: "Statistics", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("tab", { name: "Head-to-head", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".mc-h2h-list .mc-match")).toHaveCount(3);
  await page.keyboard.press("Home");
  await expect(
    page.getByRole("tab", { name: "Timeline", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
});

test("canonical match links, true 404s and all stored status labels work", async ({
  page,
  request,
}) => {
  const result = await list(request);
  const live = result.data.find((match) => match.status === "live")!;
  const redirect = await request.get(`/match/old-name-${live.publicId}`, {
    maxRedirects: 0,
  });
  expect(redirect.status()).toBe(308);
  expect(redirect.headers().location).toBe(live.href);
  for (const path of [
    "/matches/2026-02-30",
    "/match/missing-9223372036854775807",
    "/match/bad-9223372036854775808",
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "This page is off the pitch." }),
    ).toBeVisible();
  }
  for (const [status, label] of [
    ["halftime", "Half-time"],
    ["cancelled", "Cancelled"],
    ["abandoned", "Abandoned"],
  ]) {
    await page.goto(result.data.find((match) => match.status === status)!.href);
    await expect(page.locator(".mc-scoreboard-status")).toHaveText(label);
  }
  await page.goto(result.undated[0].href);
  await expect(page.locator(".mc-scoreboard-status")).toHaveText("Postponed");
  await expect(
    page.getByText("To be confirmed", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Lineups", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Lineup unavailable" }),
  ).toHaveCount(2);
  const penalty = (await list(request, "2026-09-12")).data[0];
  await page.goto(penalty.href);
  await expect(page.getByText("Penalties 5–4", { exact: true })).toBeVisible();
  await expect(page.locator(".mc-main-score .home-score")).toHaveText("1");
});

test("match center and detail sections are accessible and fit the viewport", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const scan = async () => {
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((item) => ({
        id: item.id,
        nodes: item.nodes.map((node) => node.target),
      })),
    ).toEqual([]);
  };
  await page.goto("/matches/2026-09-15");
  await scan();
  const match = (await list(request)).data.find(
    (match) => match.status === "live",
  )!;
  await page.goto(match.href);
  await scan();
  for (const name of ["Lineups", "Statistics", "Head-to-head"]) {
    await page.getByRole("tab", { name, exact: true }).click();
    await scan();
  }
  expect(errors).toEqual([]);
});
