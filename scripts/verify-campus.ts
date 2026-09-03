export {};

const uid = process.env.FT_API_UID;
const secret = process.env.FT_API_SECRET;
if (!uid || !secret) throw new Error("Set FT_API_UID and FT_API_SECRET first");

const tokenResponse = await fetch("https://api.intra.42.fr/oauth/token", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ grant_type: "client_credentials", client_id: uid, client_secret: secret }),
});
if (!tokenResponse.ok) throw new Error(`42 authentication failed (${tokenResponse.status})`);
const token = await tokenResponse.json() as { access_token: string };

const campusesResponse = await fetch("https://api.intra.42.fr/v2/campus?page[size]=100", {
  headers: { authorization: `Bearer ${token.access_token}` },
});
if (!campusesResponse.ok) throw new Error(`Campus lookup failed (${campusesResponse.status})`);
const campuses = await campusesResponse.json() as Array<{ id: number; name: string; time_zone: string }>;
const matches = campuses.filter((campus) => campus.name.toLowerCase().includes("warsaw"));
if (!matches.length) throw new Error("Warsaw campus was not found in the first 100 campuses");
console.log(matches);
