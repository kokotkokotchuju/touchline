import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const mocks = vi.hoisted(() => ({
  token: undefined as string | undefined,
  jar: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
  db: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    userSession: { findUnique: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  },
}));
vi.mock("next/headers", () => ({ cookies: async () => mocks.jar }));
vi.mock("@/server/db", () => ({ getDb: () => mocks.db }));
vi.mock("@/server/rate-limit", () => ({
  requestAddress: () => "auth-test",
  checkRateLimit: async () => ({
    allowed: true,
    remaining: 59,
    resetAt: Date.now() + 60000,
  }),
}));
import {
  getCurrentUser,
  createSession,
  clearSession,
  passwordHash,
  verifyPassword,
} from "@/server/auth";
import { enforceApiRateLimit } from "@/server/http";
import { POST } from "@/app/api/auth/route";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.token = undefined;
  mocks.jar.get.mockImplementation(() =>
    mocks.token ? { value: mocks.token } : undefined,
  );
});
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
function request(mode: string) {
  const origin = process.env.SITE_URL ?? "http://localhost:3000";
  return new Request(`${origin}/api/auth`, {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      mode,
      email: "NEW@example.com",
      password: "a-long-test-password",
    }),
  });
}

describe("Account and session access", () => {
  it("uses a browser-session cookie when Remember me is unchecked", async () => {
    await createSession("member", false);
    const options = mocks.jar.set.mock.calls[0][2];
    expect(options.httpOnly).toBe(true);
    expect(options).not.toHaveProperty("expires");
    expect(options).not.toHaveProperty("maxAge");
    expect(mocks.db.userSession.create).toHaveBeenCalled();
  });
  it("denies anonymous API access before querying storage", async () => {
    const result = await enforceApiRateLimit(
      new Request("http://localhost/api/v1/matches"),
      "matches",
    );
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.response.status).toBe(401);
    expect(mocks.db.userSession.findUnique).not.toHaveBeenCalled();
  });
  it("rejects forged, revoked and expired sessions", async () => {
    mocks.token = "forged-token";
    mocks.db.userSession.findUnique.mockResolvedValue(null);
    expect(await getCurrentUser()).toBeNull();
    expect(mocks.db.userSession.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: digest(mocks.token) } }),
    );
    mocks.db.userSession.findUnique.mockResolvedValue({
      user: { id: "member" },
      expiresAt: new Date(0),
    });
    expect(await getCurrentUser()).toBeNull();
  });
  it("allows valid sessions and revokes them on logout", async () => {
    mocks.token = "valid-token";
    mocks.db.userSession.findUnique.mockResolvedValue({
      user: { id: "member" },
      expiresAt: new Date(Date.now() + 60000),
    });
    expect(
      (
        await enforceApiRateLimit(
          new Request("http://localhost/api/v1/matches"),
          "matches",
        )
      ).allowed,
    ).toBe(true);
    await clearSession();
    expect(mocks.db.userSession.deleteMany).toHaveBeenCalledWith({
      where: { tokenHash: digest(mocks.token) },
    });
    expect(mocks.jar.delete).toHaveBeenCalledWith("touchline_session");
  });
  it("stores only a token hash and sets an HTTP-only session cookie", async () => {
    await createSession("member");
    const [name, token, options] = mocks.jar.set.mock.calls[0];
    expect(name).toBe("touchline_session");
    expect(options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    expect(mocks.db.userSession.create).toHaveBeenCalledWith({
      data: {
        userId: "member",
        tokenHash: digest(token),
        expiresAt: options.expires,
      },
    });
  });
  it("does not create an account when logging in with an unknown email", async () => {
    mocks.db.user.findUnique.mockResolvedValue(null);
    expect((await POST(request("login"))).status).toBe(401);
    expect(mocks.db.user.create).not.toHaveBeenCalled();
  });
  it("creates an account with a hashed password and starts a session", async () => {
    mocks.db.user.findUnique.mockResolvedValue(null);
    mocks.db.user.create.mockResolvedValue({
      id: "member",
      email: "new@example.com",
    });
    expect((await POST(request("signup"))).status).toBe(201);
    const { data } = mocks.db.user.create.mock.calls[0][0];
    expect(data.email).toBe("new@example.com");
    expect(data.passwordHash).not.toBe("a-long-test-password");
    expect(
      await verifyPassword("a-long-test-password", data.passwordHash),
    ).toBe(true);
    expect(mocks.jar.set).toHaveBeenCalled();
  });
  it("rejects duplicate registrations and wrong passwords", async () => {
    mocks.db.user.findUnique.mockResolvedValue({
      id: "member",
      passwordHash: await passwordHash("different-password"),
    });
    expect((await POST(request("signup"))).status).toBe(409);
    expect((await POST(request("login"))).status).toBe(401);
    expect(mocks.jar.set).not.toHaveBeenCalled();
  });
});
