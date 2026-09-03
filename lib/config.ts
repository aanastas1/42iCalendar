type RequiredEnv =
  | "FT_API_UID"
  | "FT_API_SECRET"
  | "FT_CAMPUS_ID"
  | "FT_OAUTH_REDIRECT_URI"
  | "DATABASE_URL"
  | "SESSION_SECRET";

export function env(name: RequiredEnv): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function campusId(): number {
  const value = Number(env("FT_CAMPUS_ID"));
  if (!Number.isInteger(value) || value <= 0) throw new Error("FT_CAMPUS_ID must be a positive integer");
  return value;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function secureCookies(): boolean {
  return siteUrl().startsWith("https://");
}

export function personalCalendarConfigured(): boolean {
  return ["FT_OAUTH_REDIRECT_URI", "DATABASE_URL", "SESSION_SECRET"]
    .every((name) => Boolean(process.env[name]?.trim()));
}
