import { describe, expect, it, vi } from "vitest";
import {
  eventDateWindow,
  fetchAllPages,
  fetchExamPages,
  isFortyTwoEvent,
} from "@/lib/forty-two";

const validEvent = (id: number) => ({
  id,
  name: `Event ${id}`,
  begin_at: "2026-09-10T10:00:00.000Z",
  end_at: "2026-09-10T11:00:00.000Z",
});

describe("42 events adapter", () => {
  it("creates the intended 30-day/365-day window", () => {
    const now = new Date("2026-09-03T00:00:00.000Z");
    expect(eventDateWindow(now)).toEqual({
      from: "2026-08-04T00:00:00.000Z",
      to: "2027-09-03T00:00:00.000Z",
    });
  });

  it("validates the minimum event shape", () => {
    expect(isFortyTwoEvent(validEvent(1))).toBe(true);
    expect(isFortyTwoEvent({ id: 1, name: "Broken", begin_at: "never" })).toBe(false);
  });

  it("paginates and skips malformed records", async () => {
    const first = Array.from({ length: 100 }, (_, index) => validEvent(index + 1));
    const loader = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce([
      validEvent(101),
      { id: "bad", name: "Broken", begin_at: "never" },
    ]);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const events = await fetchAllPages("/v2/campus/1/events", new Date("2026-09-03T00:00:00Z"), loader);

    expect(events).toHaveLength(101);
    expect(loader).toHaveBeenCalledTimes(2);
    expect(loader.mock.calls[0][0]).toContain("page%5Bsize%5D=100");
    expect(loader.mock.calls[1][0]).toContain("page%5Bnumber%5D=2");
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("rejects a non-array API response", async () => {
    await expect(fetchAllPages("/events", new Date(), async () => ({ error: true })))
      .rejects.toThrow("invalid events list");
  });

  it("fetches Warsaw exams with campus and date filters", async () => {
    const loader = vi.fn().mockResolvedValueOnce([{
      id: 30898,
      name: "Student Exam",
      begin_at: "2026-10-01T13:00:00.000Z",
      end_at: "2026-10-01T16:00:00.000Z",
      location: "42 Warsaw | Cluster 1",
    }]);
    const exams = await fetchExamPages(81, new Date("2026-09-03T00:00:00Z"), loader);

    expect(exams).toHaveLength(1);
    expect(loader.mock.calls[0][0]).toContain("/v2/exams?");
    expect(loader.mock.calls[0][0]).toContain("filter%5Bcampus_id%5D=81");
    expect(loader.mock.calls[0][0]).toContain("range%5Bbegin_at%5D=");
  });
});
