import { test, expect } from "@playwright/test";

test("search team links resolve to canonical slugs and valid match pages", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/search?q=Harbour");
  await page
    .getByRole("link", { name: "Sample Harbour FC HAR", exact: true })
    .click();
  await expect(page).toHaveURL(/\/team\/demo-harbour$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sample Harbour FC",
  );
  await page.locator(".mc-match").first().click();
  await expect(page).toHaveURL(/\/match\/.+-[0-9]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Harbour",
  );
  expect((await page.goto("/team/missing-team"))?.status()).toBe(404);
  expect((await page.goto("/search?q=a&q=b"))?.status()).toBe(404);
  expect(
    (await request.get(`/api/v1/search?q=${"a".repeat(101)}`)).status(),
  ).toBe(400);
  const response = await request.get("/api/v1/live");
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.source).toBe("development");
  expect(
    data.data.map((match: { status: string }) => match.status).sort(),
  ).toEqual(["halftime", "live"]);
  expect(errors).toEqual([]);
});

test("account page loads and cross-origin writes are rejected", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/my-football");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "My Football",
  );
  await expect(
    page.getByRole("heading", { name: "Sign in to save your game" }),
  ).toBeVisible();
  expect((await request.get("/api/auth")).status()).toBe(200);
  expect((await request.get("/api/account")).status()).toBe(401);
  expect(
    (
      await request.post("/api/auth", {
        headers: { origin: "https://attacker.invalid" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.put("/api/account", {
        headers: { origin: "https://attacker.invalid" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect((await request.delete("/api/auth")).status()).toBe(403);
  expect(errors).toEqual([]);
});
