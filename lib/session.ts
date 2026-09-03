import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { env, secureCookies } from "@/lib/config";

export const SESSION_COOKIE = "42ical_session";
export const OAUTH_STATE_COOKIE = "42ical_oauth_state";
const SESSION_TTL_SECONDS = 60 * 60;
const STATE_TTL_SECONDS = 10 * 60;

export type LoginSession = {
  userId: number;
  login: string;
  campusId: number;
  csrf: string;
  expiresAt: number;
  feedToken?: string;
};

type OAuthState = { value: string; expiresAt: number };

function encryptionKey(secret: string): Buffer {
  if (Buffer.byteLength(secret, "utf8") < 32) throw new Error("SESSION_SECRET must contain at least 32 bytes");
  return createHash("sha256").update(secret).digest();
}

function encode(value: object, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

function decode<T>(value: string | undefined, secret: string, now = Date.now()): T | null {
  if (!value) return null;
  try {
    const packed = Buffer.from(value, "base64url");
    if (packed.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(secret), packed.subarray(0, 12));
    decipher.setAuthTag(packed.subarray(12, 28));
    const decrypted = Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(decrypted) as T & { expiresAt?: number };
    if (!Number.isFinite(parsed.expiresAt) || parsed.expiresAt! <= now) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createCsrfToken(): string {
  return randomBytes(24).toString("base64url");
}

export function serializeSession(session: LoginSession, secret = env("SESSION_SECRET")): string {
  return encode(session, secret);
}

export function parseSession(value: string | undefined, secret?: string, now = Date.now()): LoginSession | null {
  if (!value) return null;
  const session = decode<LoginSession>(value, secret || env("SESSION_SECRET"), now);
  if (!session || !Number.isInteger(session.userId) || !Number.isInteger(session.campusId) ||
    typeof session.login !== "string" || typeof session.csrf !== "string") return null;
  return session;
}

export async function readSession(): Promise<LoginSession | null> {
  const store = await cookies();
  return parseSession(store.get(SESSION_COOKIE)?.value);
}

export function setSession(response: NextResponse, session: LoginSession): void {
  response.cookies.set(SESSION_COOKIE, serializeSession(session), {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSession(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", maxAge: 0 });
}

export function createOAuthState(now = Date.now(), secret = env("SESSION_SECRET")): { state: string; cookie: string } {
  const state = randomBytes(32).toString("base64url");
  return { state, cookie: encode({ value: state, expiresAt: now + STATE_TTL_SECONDS * 1000 }, secret) };
}

export function setOAuthState(response: NextResponse, cookie: string): void {
  response.cookies.set(OAUTH_STATE_COOKIE, cookie, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge: STATE_TTL_SECONDS,
  });
}

export function clearOAuthState(response: NextResponse): void {
  response.cookies.set(OAUTH_STATE_COOKIE, "", { httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", maxAge: 0 });
}

export function validateOAuthState(cookie: string | undefined, returned: string | null, now = Date.now(), secret = env("SESSION_SECRET")): boolean {
  const stored = decode<OAuthState>(cookie, secret, now);
  if (!stored || !returned) return false;
  const left = Buffer.from(stored.value);
  const right = Buffer.from(returned);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function validCsrf(session: LoginSession, received: FormDataEntryValue | null): boolean {
  if (typeof received !== "string") return false;
  const expected = Buffer.from(session.csrf);
  const actual = Buffer.from(received);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
