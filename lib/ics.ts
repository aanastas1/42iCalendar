import type { FortyTwoEvent } from "@/lib/forty-two";

const encoder = new TextEncoder();

export function escapeIcs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

export function foldIcsLine(line: string, maxBytes = 75): string {
  const parts: string[] = [];
  let part = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > maxBytes && part) {
      parts.push(part);
      part = "";
      bytes = 0;
    }
    part += char;
    bytes += size;
  }
  if (part || parts.length === 0) parts.push(part);
  return parts.join("\r\n ");
}

export function formatIcsDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid event date");
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function eventLines(event: FortyTwoEvent, generatedAt: Date): string[] {
  const end = event.end_at && Number.isFinite(Date.parse(event.end_at)) ? event.end_at : event.begin_at;
  const categories = [event.joined ? "SUBSCRIBED" : null, event.kind, ...(event.themes || []).map((theme) => theme.name)]
    .filter((value): value is string => Boolean(value));
  const updated = event.updated_at && Number.isFinite(Date.parse(event.updated_at))
    ? event.updated_at
    : event.created_at && Number.isFinite(Date.parse(event.created_at)) ? event.created_at : generatedAt;
  const lines = [
    "BEGIN:VEVENT",
    `UID:42-${event.source ?? "event"}-${event.id}@intra.42.fr`,
    `DTSTAMP:${formatIcsDate(generatedAt)}`,
    `LAST-MODIFIED:${formatIcsDate(updated)}`,
    `DTSTART:${formatIcsDate(event.begin_at)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcs(event.joined ? `✓ YOU JOINED — ${event.name}` : event.name)}`,
  ];
  const description = event.joined
    ? `SUBSCRIBED IN 42 INTRA${event.description ? `\n\n${event.description}` : ""}`
    : event.description;
  if (description) lines.push(`DESCRIPTION:${escapeIcs(description)}`);
  if (event.location) lines.push(`LOCATION:${escapeIcs(event.location)}`);
  if (categories.length) lines.push(`CATEGORIES:${categories.map(escapeIcs).join(",")}`);
  lines.push("END:VEVENT");
  return lines;
}

export function generateCalendar(name: string, events: FortyTwoEvent[], generatedAt = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//42iCalendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(name)}`,
    "X-WR-TIMEZONE:Europe/Warsaw",
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    "X-PUBLISHED-TTL:PT15M",
    ...events.flatMap((event) => eventLines(event, generatedAt)),
    "END:VCALENDAR",
  ];
  return `${lines.map((line) => foldIcsLine(line)).join("\r\n")}\r\n`;
}
