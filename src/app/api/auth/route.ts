import { z } from "zod";
import {
  createSession,
  getCurrentUser,
  passwordHash,
  tokenHash,
  verifyPassword,
  clearSession,
} from "@/server/auth";
import { randomBytes } from "node:crypto";
import { getDb } from "@/server/db";
import { checkRateLimit, requestAddress } from "@/server/rate-limit";
import { requireSameOrigin } from "@/server/production";

const credentials = z.object({
  remember: z.boolean().default(true),
  mode: z.enum(["login", "signup"]).default("login"),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
});
const recoveryRequest = z.object({
  action: z.literal("request-reset"),
  email: z.string().trim().email().max(254),
});
const recoveryReset = z.object({
  action: z.literal("reset-password"),
  token: z.string().min(32).max(200),
  password: z.string().min(12).max(128),
});

export async function GET() {
  const user = await getCurrentUser();
  return Response.json(user ? { email: user.email } : { user: null }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (!requireSameOrigin(request))
    return Response.json(
      { error: "A same-origin request is required." },
      { status: 403 },
    );
  const limit = await checkRateLimit(`auth:${requestAddress(request)}`, 10);
  if (!limit.allowed)
    return Response.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  const body = await request.json().catch(() => null);
  const recovery = recoveryRequest.safeParse(body);
  if (recovery.success) {
    try {
      const db = getDb();
      const user = await db.user.findUnique({
        where: { email: recovery.data.email.toLowerCase() },
        select: { id: true },
      });
      if (user) {
        await db.passwordResetToken.deleteMany({ where: { userId: user.id } });
        const token = randomBytes(32).toString("base64url");
        await db.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: tokenHash(token),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          },
        });
        const resetUrl = new URL("/password-recovery", request.url);
        resetUrl.searchParams.set("token", token);
        const mailerUrl = process.env.PASSWORD_RESET_MAILER_URL;
        const mailerSecret = process.env.PASSWORD_RESET_MAILER_SECRET;
        if (!mailerUrl || !mailerSecret) {
          await db.passwordResetToken.deleteMany({ where: { userId: user.id } });
          throw new Error("Password reset mailer is not configured.");
        }
        const mailResponse = await fetch(mailerUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Mailer-Secret": mailerSecret,
          },
          body: JSON.stringify({
            email: recovery.data.email.toLowerCase(),
            resetUrl: resetUrl.toString(),
          }),
          cache: "no-store",
        });
        if (!mailResponse.ok) {
          await db.passwordResetToken.deleteMany({
            where: { userId: user.id },
          });
          throw new Error(`Password reset mailer returned ${mailResponse.status}.`);
        }
        return Response.json({
          message: "If that email has an account, a reset link has been sent. Check your inbox.",
        });
      }
      return Response.json({
        message: "If that email has an account, a reset link is ready.",
      });
    } catch (error) {
      console.error("Password recovery request failed.", error);
      return Response.json(
        {
          error:
            process.env.NODE_ENV !== "production" &&
            error instanceof Error &&
            error.message === "Password reset mailer is not configured."
              ? "Email service is not configured. Add the SMTP and mailer settings, then restart the app."
              : "Password recovery is temporarily unavailable.",
        },
        { status: 503 },
      );
    }
  }
  const reset = recoveryReset.safeParse(body);
  if (reset.success) {
    try {
      const db = getDb();
      const record = await db.passwordResetToken.findUnique({
        where: { tokenHash: tokenHash(reset.data.token) },
      });
      if (!record || record.usedAt || record.expiresAt <= new Date())
        return Response.json(
          { error: "This reset link is invalid or has expired." },
          { status: 400 },
        );
      await db.$transaction([
        db.user.update({
          where: { id: record.userId },
          data: { passwordHash: await passwordHash(reset.data.password) },
        }),
        db.passwordResetToken.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        }),
        db.userSession.deleteMany({ where: { userId: record.userId } }),
      ]);
      return Response.json({ message: "Password updated. You can now log in." });
    } catch (error) {
      console.error("Password reset failed.", error);
      return Response.json(
        { error: "Password recovery is temporarily unavailable." },
        { status: 503 },
      );
    }
  }
  const parsed = credentials.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { error: "Use a valid email and password of at least 12 characters." },
      { status: 400 },
    );
  const db = getDb();
  const email = parsed.data.email.toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (parsed.data.mode === "signup") {
    if (user)
      return Response.json(
        { error: "An account already exists. Please log in." },
        { status: 409 },
      );
    let created;
    try {
      created = await db.user.create({
        data: {
          email,
          passwordHash: await passwordHash(parsed.data.password),
          notificationPreference: { create: {} },
        },
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      )
        return Response.json(
          { error: "An account already exists. Please log in." },
          { status: 409 },
        );
      throw error;
    }
    await createSession(created.id, parsed.data.remember);
    return Response.json({ email: created.email }, { status: 201 });
  }
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash)))
    return Response.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  await createSession(user.id, parsed.data.remember);
  return Response.json({ email: user.email });
}

export async function DELETE(request: Request) {
  if (!requireSameOrigin(request))
    return Response.json(
      { error: "A same-origin request is required." },
      { status: 403 },
    );
  await clearSession();
  return Response.json({ ok: true });
}
