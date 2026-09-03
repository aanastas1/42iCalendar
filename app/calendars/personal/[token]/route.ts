import { lookupPersonalFeed, touchPersonalFeed } from "@/lib/db";
import { hashFeedToken, isFeedToken } from "@/lib/feed-token";
import { FortyTwoApiError, getUserEvents } from "@/lib/forty-two";
import { generateCalendar } from "@/lib/ics";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!isFeedToken(token)) return new Response("Calendar not found", { status: 404 });
  const tokenHash = hashFeedToken(token);
  try {
    const feed = await lookupPersonalFeed(tokenHash);
    if (!feed) return new Response("Calendar not found", { status: 404 });
    if (feed.revokedAt) return new Response("Calendar link revoked", { status: 410 });
    const events = (await getUserEvents(feed.userId)).map((event) => ({ ...event, joined: true }));
    const calendar = generateCalendar("42iCalendar — You Joined", events);
    await touchPersonalFeed(tokenHash);
    return new Response(calendar, {
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "cache-control": "private, max-age=900",
        "content-disposition": "inline; filename=42icalendar-you-joined.ics",
      },
    });
  } catch (error) {
    const status = error instanceof FortyTwoApiError && error.status === 429 ? 503 : 502;
    console.error("Personal calendar generation failed", error instanceof Error ? error.message : "unknown error");
    return new Response("Calendar temporarily unavailable", { status, headers: { "cache-control": "no-store" } });
  }
}
