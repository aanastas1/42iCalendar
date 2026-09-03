import { NextRequest, NextResponse } from "next/server";
import { campusId, siteUrl } from "@/lib/config";
import { revokePersonalFeed, rotatePersonalFeed } from "@/lib/db";
import { createFeedToken, hashFeedToken } from "@/lib/feed-token";
import { parseSession, SESSION_COOKIE, setSession, validCsrf } from "@/lib/session";

export const runtime = "nodejs";

function redirect(status: string): NextResponse {
  return NextResponse.redirect(new URL(`/?personal=${status}#personal`, siteUrl()), 303);
}

export async function POST(request: NextRequest) {
  const session = parseSession(request.cookies.get(SESSION_COOKIE)?.value);
  const data = await request.formData();
  if (!session || !validCsrf(session, data.get("csrf"))) return new Response("Forbidden", { status: 403 });
  if (session.campusId !== campusId()) return redirect("wrong-campus");
  const action = data.get("action");

  try {
    if (action === "revoke") {
      await revokePersonalFeed(session.userId);
      const response = redirect("revoked");
      const withoutToken = { ...session };
      delete withoutToken.feedToken;
      setSession(response, withoutToken);
      return response;
    }
    if (action !== "create" && action !== "regenerate") return new Response("Invalid action", { status: 400 });
    const token = createFeedToken();
    await rotatePersonalFeed(session.userId, session.login, session.campusId, hashFeedToken(token));
    const response = redirect(action === "create" ? "created" : "regenerated");
    setSession(response, { ...session, feedToken: token });
    return response;
  } catch (error) {
    console.error("Personal feed action failed", error instanceof Error ? error.message : "unknown error");
    return redirect("failed");
  }
}
