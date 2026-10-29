import { env } from "@/lib/config";

const API_BASE = "https://api.intra.42.fr";
const PAGE_SIZE = 100;
const REQUEST_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 15 * 60 * 1000;

type TokenResponse = { access_token: string; expires_in: number };

export type FortyTwoEvent = {
  id: number;
  source?: "event" | "exam";
  joined?: boolean;
  name: string;
  description?: string | null;
  location?: string | null;
  kind?: string | null;
  begin_at: string;
  end_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  themes?: Array<{ name?: string | null }>;
};

export type FortyTwoExam = {
  id: number;
  name: string;
  begin_at: string;
  end_at?: string | null;
  location?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  projects?: Array<{ name?: string | null }>;
};

export type FortyTwoMe = {
  id: number;
  login: string;
  campus?: Array<{ id?: number }>;
  campus_users?: Array<{ campus_id?: number; is_primary?: boolean }>;
};

export class FortyTwoApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "FortyTwoApiError";
  }
}

let appToken: { value: string; expiresAt: number } | null = null;
let tokenPromise: Promise<string> | null = null;
const eventCache = new Map<string, { expiresAt: number; events: FortyTwoEvent[] }>();

async function request(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new FortyTwoApiError(504, "42 API request timed out");
    }
    throw new FortyTwoApiError(502, "42 API is unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

export async function getAppToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && appToken && appToken.expiresAt > Date.now() + 60_000) return appToken.value;
  if (!forceRefresh && tokenPromise) return tokenPromise;

  tokenPromise = (async () => {
    const response = await request(`${API_BASE}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: env("FT_API_UID"),
        client_secret: env("FT_API_SECRET"),
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      // The token response body never contains credentials, so its start is safe to log.
      const detail = (await response.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 160);
      throw new FortyTwoApiError(response.status, `42 authentication failed (HTTP ${response.status}): ${detail}`);
    }
    const data = (await response.json()) as Partial<TokenResponse>;
    if (!data.access_token || !Number.isFinite(data.expires_in)) {
      throw new FortyTwoApiError(502, "42 returned an invalid token response");
    }
    appToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in! * 1000 };
    return data.access_token;
  })();

  try {
    return await tokenPromise;
  } finally {
    tokenPromise = null;
  }
}

async function authorizedJson<T>(path: string, retry = true): Promise<T> {
  const response = await request(`${API_BASE}${path}`, {
    headers: { authorization: `Bearer ${await getAppToken()}`, accept: "application/json" },
    cache: "no-store",
  });
  if (response.status === 401 && retry) {
    appToken = null;
    return authorizedJson<T>(path, false);
  }
  if (!response.ok) {
    const status = response.status === 429 ? 429 : response.status >= 500 ? 502 : response.status;
    throw new FortyTwoApiError(status, status === 429 ? "42 API rate limit reached" : "42 API request failed");
  }
  try {
    return await response.json() as T;
  } catch {
    throw new FortyTwoApiError(502, "42 API returned invalid JSON");
  }
}

export function eventDateWindow(now = new Date()): { from: string; to: string } {
  return {
    from: new Date(now.getTime() - 30 * 86400_000).toISOString(),
    to: new Date(now.getTime() + 365 * 86400_000).toISOString(),
  };
}

export function isFortyTwoEvent(value: unknown): value is FortyTwoEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<FortyTwoEvent>;
  return Number.isInteger(event.id) && typeof event.name === "string" &&
    typeof event.begin_at === "string" && Number.isFinite(Date.parse(event.begin_at));
}

export function isFortyTwoExam(value: unknown): value is FortyTwoExam {
  return isFortyTwoEvent(value);
}

export async function fetchAllPages(
  basePath: string,
  now = new Date(),
  load: (path: string) => Promise<unknown> = authorizedJson,
): Promise<FortyTwoEvent[]> {
  const { from, to } = eventDateWindow(now);
  const events: FortyTwoEvent[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const params = new URLSearchParams({
      "range[begin_at]": `${from},${to}`,
      sort: "begin_at",
      "page[number]": String(page),
      "page[size]": String(PAGE_SIZE),
    });
    const batch = await load(`${basePath}?${params}`);
    if (!Array.isArray(batch)) throw new FortyTwoApiError(502, "42 returned an invalid events list");
    for (const candidate of batch) {
      if (isFortyTwoEvent(candidate)) events.push(candidate);
      else console.warn("Skipped one malformed 42 event");
    }
    if (batch.length < PAGE_SIZE) return events;
  }
  throw new FortyTwoApiError(502, "42 event pagination exceeded the safety limit");
}

export async function fetchExamPages(
  campusId: number,
  now = new Date(),
  load: (path: string) => Promise<unknown> = authorizedJson,
): Promise<FortyTwoExam[]> {
  const { from, to } = eventDateWindow(now);
  const exams: FortyTwoExam[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const params = new URLSearchParams({
      "filter[campus_id]": String(campusId),
      "range[begin_at]": `${from},${to}`,
      sort: "begin_at",
      "page[number]": String(page),
      "page[size]": String(PAGE_SIZE),
    });
    const batch = await load(`/v2/exams?${params}`);
    if (!Array.isArray(batch)) throw new FortyTwoApiError(502, "42 returned an invalid exams list");
    for (const candidate of batch) {
      if (isFortyTwoExam(candidate)) exams.push(candidate);
      else console.warn("Skipped one malformed 42 exam");
    }
    if (batch.length < PAGE_SIZE) return exams;
  }
  throw new FortyTwoApiError(502, "42 exam pagination exceeded the safety limit");
}

export async function getCampusEvents(campusId: number): Promise<FortyTwoEvent[]> {
  const key = `campus:${campusId}`;
  const cached = eventCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.events;
  const events = await fetchAllPages(`/v2/campus/${campusId}/events`);
  eventCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, events });
  return events;
}

export async function getCampusExams(campusId: number): Promise<FortyTwoEvent[]> {
  const key = `exams:${campusId}`;
  const cached = eventCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.events;
  const exams = (await fetchExamPages(campusId)).map((exam): FortyTwoEvent => {
    const projects = Array.isArray(exam.projects)
      ? exam.projects.map((project) => project?.name).filter((name): name is string => Boolean(name))
      : [];
    return {
      ...exam,
      source: "exam",
      kind: "exam",
      description: projects.length ? `Projects: ${projects.join(", ")}` : "42 exam",
      themes: [],
    };
  });
  eventCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, events: exams });
  return exams;
}

export async function getCampusCalendarItems(campusId: number): Promise<FortyTwoEvent[]> {
  const [events, exams] = await Promise.all([getCampusEvents(campusId), getCampusExams(campusId)]);
  return [...events, ...exams].sort((left, right) => Date.parse(left.begin_at) - Date.parse(right.begin_at));
}

export async function getUserEvents(userId: number): Promise<FortyTwoEvent[]> {
  const key = `user:${userId}`;
  const cached = eventCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.events;
  const events = await fetchAllPages(`/v2/users/${userId}/events`);
  eventCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, events });
  return events;
}

export async function exchangeAuthorizationCode(code: string, redirectUri: string): Promise<string> {
  const response = await request(`${API_BASE}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: env("FT_API_UID"),
      client_secret: env("FT_API_SECRET"),
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new FortyTwoApiError(response.status, "42 OAuth token exchange failed");
  const data = await response.json() as Partial<TokenResponse>;
  if (!data.access_token) throw new FortyTwoApiError(502, "42 returned an invalid OAuth token response");
  return data.access_token;
}

export async function getMe(accessToken: string): Promise<FortyTwoMe> {
  const response = await request(`${API_BASE}/v2/me`, {
    headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new FortyTwoApiError(response.status, "42 profile request failed");
  const me = await response.json() as Partial<FortyTwoMe>;
  if (!Number.isInteger(me.id) || typeof me.login !== "string") {
    throw new FortyTwoApiError(502, "42 returned an invalid profile response");
  }
  return me as FortyTwoMe;
}

export function primaryCampusId(me: FortyTwoMe): number | null {
  const primary = me.campus_users?.find((membership) => membership.is_primary)?.campus_id;
  const fallback = me.campus?.[0]?.id;
  return Number.isInteger(primary) ? primary! : Number.isInteger(fallback) ? fallback! : null;
}

export function clearApiCaches(): void {
  appToken = null;
  tokenPromise = null;
  eventCache.clear();
}
