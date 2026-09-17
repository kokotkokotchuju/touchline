import "server-only";

import {
  createHash,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { getDb } from "@/server/db";

const scrypt = promisify(nodeScrypt);
const cookieName = "touchline_session";
const sessionDays = 30;

async function hashPassword(password: string, salt: Buffer) {
  return (await scrypt(password, salt, 64)) as Buffer;
}

async function passwordHash(password: string) {
  const salt = randomBytes(16);
  const derived = await hashPassword(password, salt);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await hashPassword(password, Buffer.from(saltHex, "hex"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, remember = true) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDays * 86400000);
  await getDb().userSession.create({
    data: { userId, tokenHash: tokenHash(token), expiresAt },
  });
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { expires: expiresAt } : {}),
  });
}

export async function getCurrentUser() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const session = await getDb().userSession.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: {
      user: { include: { favorites: true, notificationPreference: true } },
    },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  return session.user;
}

export async function clearSession() {
  const token = (await cookies()).get(cookieName)?.value;
  if (token)
    await getDb().userSession.deleteMany({
      where: { tokenHash: tokenHash(token) },
    });
  (await cookies()).delete(cookieName);
}

export { passwordHash, verifyPassword };
