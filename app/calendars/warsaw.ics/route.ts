import { campusId } from "@/lib/config";
import { FortyTwoApiError, getCampusCalendarItems } from "@/lib/forty-two";
import { generateCalendar } from "@/lib/ics";

export const runtime = "nodejs";

export async function GET() {
  try {
    const calendar = generateCalendar("42iCalendar — Warsaw", await getCampusCalendarItems(campusId()));
    return new Response(calendar, {
      status: 200,
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": "inline; filename=42-warsaw.ics",
        "cache-control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    const status = error instanceof FortyTwoApiError && error.status === 429 ? 503 : 503;
    console.error(error instanceof Error ? error.message : "Calendar generation failed");
    return Response.json({ error: "Calendar is temporarily unavailable" }, {
      status,
      headers: { "cache-control": "no-store" },
    });
  }
}
