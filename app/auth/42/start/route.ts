import { NextResponse } from "next/server";
import { env } from "@/lib/config";
import { createOAuthState, setOAuthState } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const { state, cookie } = createOAuthState();
  const authorization = new URL("https://api.intra.42.fr/oauth/authorize");
  authorization.search = new URLSearchParams({
    client_id: env("FT_API_UID"),
    redirect_uri: env("FT_OAUTH_REDIRECT_URI"),
    response_type: "code",
    state,
  }).toString();
  const response = NextResponse.redirect(authorization);
  setOAuthState(response, cookie);
  return response;
}
