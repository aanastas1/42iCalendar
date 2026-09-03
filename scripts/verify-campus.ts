import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

type Campus = { id: number; name: string; time_zone: string };

function loadLocalEnvironment(): void {
  for (const file of [".env.local", ".env"]) {
    if (existsSync(file)) {
      loadEnvFile(file);
      return;
    }
  }
}

async function findWarsawCampuses(accessToken: string): Promise<Campus[]> {
  const matches: Campus[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const params = new URLSearchParams({
      "page[number]": String(page),
      "page[size]": "100",
    });
    const response = await fetch(`https://api.intra.42.fr/v2/campus?${params}`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Campus lookup failed (${response.status})`);
    const campuses = await response.json() as Campus[];
    matches.push(...campuses.filter((campus) => campus.name.toLowerCase().includes("warsaw")));
    if (campuses.length < 100) return matches;
  }
  throw new Error("Campus lookup exceeded the pagination safety limit");
}

async function main(): Promise<void> {
  loadLocalEnvironment();
  const uid = process.env.FT_API_UID?.trim();
  const secret = process.env.FT_API_SECRET?.trim();
  if (!uid || !secret || uid.startsWith("your_") || secret.startsWith("your_")) {
    throw new Error("Add the real FT_API_UID and FT_API_SECRET to .env.local first");
  }

  const tokenResponse = await fetch("https://api.intra.42.fr/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: uid,
      client_secret: secret,
    }),
  });
  if (!tokenResponse.ok) throw new Error(`42 authentication failed (${tokenResponse.status})`);
  const token = await tokenResponse.json() as { access_token?: string };
  if (!token.access_token) throw new Error("42 returned a token response without an access token");

  const matches = await findWarsawCampuses(token.access_token);
  if (!matches.length) throw new Error("Warsaw campus was not found");
  for (const campus of matches) {
    console.log(`Found: ${campus.name} (timezone: ${campus.time_zone})`);
    console.log(`FT_CAMPUS_ID=${campus.id}`);
  }
  console.log("Copy the FT_CAMPUS_ID line into .env.local.");
}

main().catch((error: unknown) => {
  console.error(`Error: ${error instanceof Error ? error.message : "Campus verification failed"}`);
  process.exitCode = 1;
});
