import { NextRequest, NextResponse } from "next/server";
import { siteUrl } from "@/lib/config";
import { clearSession, parseSession, SESSION_COOKIE, validCsrf } from "@/lib/session";

export async function POST(request: NextRequest) {
  const session = parseSession(request.cookies.get(SESSION_COOKIE)?.value);
  const data = await request.formData();
  if (!session || !validCsrf(session, data.get("csrf"))) return new Response("Forbidden", { status: 403 });
  const response = NextResponse.redirect(new URL("/#personal", siteUrl()), 303);
  clearSession(response);
  return response;
}
