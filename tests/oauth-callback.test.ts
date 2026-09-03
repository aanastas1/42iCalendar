import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createOAuthState,
  OAUTH_STATE_COOKIE,
  parseSession,
  SESSION_COOKIE,
} from "@/lib/session";

const exchangeAuthorizationCode = vi.fn();
const getMe = vi.fn();
vi.mock("@/lib/forty-two", () => ({
  exchangeAuthorizationCode,
  getMe,
  primaryCampusId: (me: { campus_users?: Array<{ campus_id: number; is_primary: boolean }> }) =>
    me.campus_users?.find((campus) => campus.is_primary)?.campus_id ?? null,
}));

const secret = "test-session-secret-that-is-long-enough";

describe("42 OAuth callback", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = secret;
    process.env.FT_API_UID = "uid";
    process.env.FT_API_SECRET = "secret";
    process.env.FT_OAUTH_REDIRECT_URI = "http://localhost:3000/auth/42/callback";
    process.env.FT_CAMPUS_ID = "81";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    exchangeAuthorizationCode.mockReset().mockResolvedValue("temporary-oauth-token");
    getMe.mockReset();
  });

  it("rejects an invalid OAuth state", async () => {
    const { GET } = await import("@/app/auth/42/callback/route");
    const response = await GET(new NextRequest("http://localhost:3000/auth/42/callback?state=wrong&code=x"));
    expect(response.headers.get("location")).toContain("invalid-state");
    expect(exchangeAuthorizationCode).not.toHaveBeenCalled();
  });

  it("creates a short session but rejects personal feeds for a non-Warsaw primary campus", async () => {
    const state = createOAuthState(Date.now(), secret);
    getMe.mockResolvedValue({
      id: 42,
      login: "student",
      campus_users: [{ campus_id: 99, is_primary: true }],
    });
    const request = new NextRequest(`http://localhost:3000/auth/42/callback?state=${state.state}&code=x`, {
      headers: { cookie: `${OAUTH_STATE_COOKIE}=${state.cookie}` },
    });
    const { GET } = await import("@/app/auth/42/callback/route");
    const response = await GET(request);
    const setCookie = response.headers.get("set-cookie") || "";
    const encrypted = new RegExp(`${SESSION_COOKIE}=([^;]+)`).exec(setCookie)?.[1];
    const session = parseSession(encrypted, secret);

    expect(response.headers.get("location")).toContain("wrong-campus");
    expect(session?.campusId).toBe(99);
    expect(JSON.stringify(session)).not.toContain("temporary-oauth-token");
  });
});
