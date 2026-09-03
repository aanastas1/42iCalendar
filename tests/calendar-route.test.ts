import ICAL from "ical.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCampusEvents = vi.fn();

vi.mock("@/lib/config", () => ({ campusId: () => 81 }));
vi.mock("@/lib/forty-two", () => ({
  FortyTwoApiError: class FortyTwoApiError extends Error {
    constructor(public readonly status: number, message: string) {
      super(message);
    }
  },
  getCampusEvents,
}));

describe("Warsaw calendar HTTP route", () => {
  beforeEach(() => getCampusEvents.mockReset());

  it("returns a parseable calendar response", async () => {
    getCampusEvents.mockResolvedValueOnce([{
      id: 7,
      name: "Warsaw workshop",
      begin_at: "2026-09-10T10:00:00.000Z",
      end_at: "2026-09-10T11:00:00.000Z",
      location: "42 Warsaw",
    }]);
    const { GET } = await import("@/app/calendars/warsaw.ics/route");
    const response = await GET();
    const body = await response.text();
    const calendar = new ICAL.Component(ICAL.parse(body));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/calendar; charset=utf-8");
    expect(response.headers.get("cache-control")).toContain("s-maxage=900");
    expect(calendar.getFirstSubcomponent("vevent")?.getFirstPropertyValue("uid"))
      .toBe("42-event-7@intra.42.fr");
    expect(getCampusEvents).toHaveBeenCalledWith(81);
  });

  it("returns a sanitized no-store error when 42 is unavailable", async () => {
    getCampusEvents.mockRejectedValueOnce(new Error("secret upstream response"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { GET } = await import("@/app/calendars/warsaw.ics/route");
    const response = await GET();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "Calendar is temporarily unavailable" });
    consoleError.mockRestore();
  });
});
