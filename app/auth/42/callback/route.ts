import { NextRequest, NextResponse } from "next/server";
import { campusId, env, siteUrl } from "@/lib/config";
import { exchangeAuthorizationCode, getMe, primaryCampusId } from "@/lib/forty-two";
import {
  clearOAuthState,
  createCsrfToken,
  OAUTH_STATE_COOKIE,
  setSession,
  validateOAuthState,
} from "@/lib/session";

export const runtime = "nodejs";

function home(message: string): URL {
  return new URL(`/?auth=${encodeURIComponent(message)}#personal`, siteUrl());
}

export async function GET(request: NextRequest) {
  const stateValid = validateOAuthState(
    request.cookies.get(OAUTH_STATE_COOKIE)?.value,
    request.nextUrl.searchParams.get("state"),
  );
  if (!stateValid) {
    const response = NextResponse.redirect(home("invalid-state"));
    clearOAuthState(response);
    return response;
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code || request.nextUrl.searchParams.has("error")) {
    const response = NextResponse.redirect(home("cancelled"));
    clearOAuthState(response);
    return response;
  }

  try {
    const accessToken = await exchangeAuthorizationCode(code, env("FT_OAUTH_REDIRECT_URI"));
    const me = await getMe(accessToken);
    const userCampusId = primaryCampusId(me);
    if (!userCampusId) throw new Error("42 profile has no campus");
    const response = NextResponse.redirect(home(userCampusId === campusId() ? "signed-in" : "wrong-campus"));
    setSession(response, {
      userId: me.id,
      login: me.login,
      campusId: userCampusId,
      csrf: createCsrfToken(),
      expiresAt: Date.now() + 60 * 60 * 1000,
    });
    clearOAuthState(response);
    return response;
  } catch (error) {
    console.error("42 OAuth callback failed", error instanceof Error ? error.message : "unknown error");
    const response = NextResponse.redirect(home("failed"));
    clearOAuthState(response);
    return response;
  }
}
