import ICAL from "ical.js";
import { describe, expect, it } from "vitest";
import { escapeIcs, foldIcsLine, formatIcsDate, generateCalendar } from "@/lib/ics";
import type { FortyTwoEvent } from "@/lib/forty-two";

const event: FortyTwoEvent = {
  id: 4242,
  name: "Café, code; repeat \\",
  description: "First line\nSecond line",
  location: "Warsaw, level 2",
  kind: "workshop",
  begin_at: "2026-09-10T10:00:00.000Z",
  end_at: "2026-09-10T12:00:00.000Z",
  updated_at: "2026-09-01T08:30:00.000Z",
  themes: [{ name: "AI" }],
};

describe("iCalendar generation", () => {
  it("escapes RFC 5545 text characters", () => {
    expect(escapeIcs("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
  });

  it("formats UTC dates", () => {
    expect(formatIcsDate("2026-09-10T10:00:00.000Z")).toBe("20260910T100000Z");
  });

  it("folds UTF-8 lines without exceeding 75 octets", () => {
    const folded = foldIcsLine(`DESCRIPTION:${"żółć".repeat(40)}`);
    for (const line of folded.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(76);
    }
    expect(folded).toContain("\r\n ");
  });

  it("creates a parseable calendar with a stable UID and no alarm", () => {
    const output = generateCalendar("42 Warsaw — All Events", [event], new Date("2026-09-03T12:00:00Z"));
    const component = new ICAL.Component(ICAL.parse(output));
    const vevent = component.getFirstSubcomponent("vevent");
    expect(component.name).toBe("vcalendar");
    expect(vevent?.getFirstPropertyValue("uid")).toBe("42-event-4242@intra.42.fr");
    expect(vevent?.getFirstSubcomponent("valarm")).toBeNull();
    expect(output).toMatch(/\r\n/);
    expect(output.endsWith("\r\n")).toBe(true);
  });
});
