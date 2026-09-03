import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { serializeSession, SESSION_COOKIE, type LoginSession } from "@/lib/session";

const rotatePersonalFeed = vi.fn();
const revokePersonalFeed = vi.fn();
vi.mock("@/lib/db", () => ({ rotatePersonalFeed, revokePersonalFeed }));

const secret = "test-session-secret-that-is-long-enough";
const session: LoginSession = {
  userId: 42,
  login: "student",
  campusId: 81,
  csrf: "csrf-token",
  expiresAt: Date.now() + 60_000,
};

function request(action: string, csrf = session.csrf): NextRequest {
  return new NextRequest("http://localhost:3000/personal/feed", {
    method: "POST",
    headers: {
      cookie: `${SESSION_COOKIE}=${serializeSession(session, secret)}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ action, csrf }),
  });
}

describe("personal feed actions", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = secret;
    process.env.FT_CAMPUS_ID = "81";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    rotatePersonalFeed.mockReset();
    revokePersonalFeed.mockReset();
  });

  it("creates a hashed feed owned by the signed-in user", async () => {
    const { POST } = await import("@/app/personal/feed/route");
    const response = await POST(request("create"));
    expect(response.status).toBe(303);
    expect(rotatePersonalFeed).toHaveBeenCalledOnce();
    expect(rotatePersonalFeed.mock.calls[0].slice(0, 3)).toEqual([42, "student", 81]);
    expect(rotatePersonalFeed.mock.calls[0][3]).toMatch(/^[a-f0-9]{64}$/);
    expect(response.headers.get("set-cookie")).not.toContain(rotatePersonalFeed.mock.calls[0][3]);
  });

  it("revokes only the signed-in user's active feed", async () => {
    const { POST } = await import("@/app/personal/feed/route");
    expect((await POST(request("revoke"))).status).toBe(303);
    expect(revokePersonalFeed).toHaveBeenCalledWith(42);
  });

  it("rejects a forged CSRF value", async () => {
    const { POST } = await import("@/app/personal/feed/route");
    expect((await POST(request("create", "forged"))).status).toBe(403);
    expect(rotatePersonalFeed).not.toHaveBeenCalled();
  });
});
