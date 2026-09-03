import ICAL from "ical.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const lookupPersonalFeed = vi.fn();
const touchPersonalFeed = vi.fn();
const getUserEvents = vi.fn();

vi.mock("@/lib/db", () => ({ lookupPersonalFeed, touchPersonalFeed }));
vi.mock("@/lib/forty-two", () => ({
  FortyTwoApiError: class FortyTwoApiError extends Error {
    constructor(public status: number, message: string) { super(message); }
  },
  getUserEvents,
}));

describe("personal calendar route", () => {
  beforeEach(() => {
    lookupPersonalFeed.mockReset();
    touchPersonalFeed.mockReset();
    getUserEvents.mockReset();
  });

  it("marks joined events clearly in a parseable private feed", async () => {
    lookupPersonalFeed.mockResolvedValue({ userId: 42, login: "student", campusId: 81, revokedAt: null });
    getUserEvents.mockResolvedValue([{
      id: 7,
      name: "Warsaw workshop",
      begin_at: "2026-09-10T10:00:00.000Z",
      end_at: "2026-09-10T11:00:00.000Z",
      kind: "event",
    }]);
    const { GET } = await import("@/app/calendars/personal/[token]/route");
    const response = await GET(new Request("https://example.test"), { params: Promise.resolve({ token: "a".repeat(43) }) });
    const calendar = new ICAL.Component(ICAL.parse(await response.text()));
    const event = calendar.getFirstSubcomponent("vevent");

    expect(response.status).toBe(200);
    expect(event?.getFirstPropertyValue("summary")).toBe("✓ YOU JOINED — Warsaw workshop");
    expect(event?.getFirstPropertyValue("categories")).toContain("SUBSCRIBED");
    expect(touchPersonalFeed).toHaveBeenCalledOnce();
  });

  it("returns 410 for a revoked link and 404 for an unknown one", async () => {
    const { GET } = await import("@/app/calendars/personal/[token]/route");
    lookupPersonalFeed.mockResolvedValueOnce({ userId: 42, login: "student", campusId: 81, revokedAt: new Date() });
    expect((await GET(new Request("https://example.test"), { params: Promise.resolve({ token: "b".repeat(43) }) })).status).toBe(410);
    lookupPersonalFeed.mockResolvedValueOnce(null);
    expect((await GET(new Request("https://example.test"), { params: Promise.resolve({ token: "c".repeat(43) }) })).status).toBe(404);
  });
});
