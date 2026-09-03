import { describe, expect, it } from "vitest";
import {
  createOAuthState,
  parseSession,
  serializeSession,
  validateOAuthState,
  validCsrf,
  type LoginSession,
} from "@/lib/session";

const secret = "test-session-secret-that-is-long-enough";
const session: LoginSession = {
  userId: 42,
  login: "student",
  campusId: 81,
  csrf: "csrf-token",
  expiresAt: 2_000,
};

describe("signed login state", () => {
  it("accepts a valid session and rejects tampering or expiry", () => {
    const cookie = serializeSession(session, secret);
    expect(parseSession(cookie, secret, 1_000)?.login).toBe("student");
    expect(parseSession(`${cookie}x`, secret, 1_000)).toBeNull();
    expect(parseSession(cookie, secret, 2_001)).toBeNull();
  });

  it("rejects a weak encryption secret", () => {
    expect(() => serializeSession(session, "too-short")).toThrow("at least 32 bytes");
  });

  it("validates CSRF without accepting missing or changed values", () => {
    expect(validCsrf(session, "csrf-token")).toBe(true);
    expect(validCsrf(session, "csrf-other")).toBe(false);
    expect(validCsrf(session, null)).toBe(false);
  });

  it("accepts the one-time OAuth state only before expiration", () => {
    const state = createOAuthState(1_000, secret);
    expect(validateOAuthState(state.cookie, state.state, 2_000, secret)).toBe(true);
    expect(validateOAuthState(state.cookie, "wrong", 2_000, secret)).toBe(false);
    expect(validateOAuthState(state.cookie, state.state, 602_000, secret)).toBe(false);
  });
});
