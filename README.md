# 42iCalendar

42iCalendar publishes two read-only Apple Calendar subscriptions for 42 Warsaw:

- **All campus dates** — every Warsaw event and scheduled exam, without login.
- **You joined** — only events joined by the signed-in student. Titles begin with `✓ YOU JOINED —` and include the `SUBSCRIBED` category, so they remain easy to distinguish when both calendars are enabled.

Joining or leaving an event still happens in 42 Intra. Calendar data refreshes every 15 minutes.

## Create the 42 API application

1. Create an application in the 42 API portal.
2. Allow **Access the user public data**. The project does not need team, project, media, community, topic, or message management permissions.
3. Add the development callback `http://localhost:3000/auth/42/callback`.
4. Add the production callback `https://YOUR-PROJECT.vercel.app/auth/42/callback`.
5. Copy the application UID and secret. Never commit or expose the secret.

The OAuth access token is used only for `GET /v2/me`, then discarded. Personal calendar updates use the application credential with `GET /v2/users/:user_id/events`.

## Configure locally

```bash
cp .env.example .env.local
```

Complete `.env.local`:

```dotenv
FT_API_UID=...
FT_API_SECRET=...
FT_OAUTH_REDIRECT_URI=http://localhost:3000/auth/42/callback
FT_CAMPUS_ID=...
DATABASE_URL=postgresql://...
SESSION_SECRET=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Generate a session secret with:

```bash
openssl rand -base64 48
```

Find the exact Warsaw campus ID:

```bash
npm run verify:campus
```

## Create Neon and run the migration

1. Create a Neon Postgres project.
2. Copy its pooled connection URL to `DATABASE_URL`.
3. Apply the schema:

```bash
npm run db:migrate
```

Only the SHA-256 hash of each private calendar token is stored. Regeneration revokes the old URL immediately; revoked URLs return `410 Gone` and unknown URLs return `404`.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Local subscriptions refresh only while the development server and Mac are running, so use the Vercel URL for the real Apple Calendar subscription.

## Deploy to Vercel

1. Import the GitHub repository into Vercel.
2. Add every variable from `.env.example` to the Production environment.
3. Set both production URLs exactly:

```dotenv
FT_OAUTH_REDIRECT_URI=https://YOUR-PROJECT.vercel.app/auth/42/callback
NEXT_PUBLIC_SITE_URL=https://YOUR-PROJECT.vercel.app
```

4. Run `npm run db:migrate` once against the production `DATABASE_URL`.
5. Redeploy after changing environment variables.

Never prefix a secret with `NEXT_PUBLIC_`.

## Add to Apple Calendar

### Mac

1. Choose **Calendar → File → New Calendar Subscription**.
2. Paste one of the HTTPS calendar URLs from 42iCalendar.
3. Choose **iCloud** as the location for cross-device sync.
4. Select an automatic refresh interval.

### iPhone or iPad

1. Open **Calendar → Calendars**.
2. Choose **Add Calendar → Add Subscription Calendar**.
3. Paste the HTTPS feed URL and save it to iCloud when offered.

You may enable both feeds. Joined events can then appear twice by design, but the personal copy is marked `✓ YOU JOINED` and categorized `SUBSCRIBED`.

## Verification

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

The automated suite checks API pagination and date filters, Unicode-safe iCalendar folding, parsing, stable UIDs, exam IDs, joined-event labels, token hashing, encrypted session expiry, OAuth state, CSRF, and revoked or unknown personal links.

## Troubleshooting

- **42 authentication returns 401:** verify `FT_API_UID` and `FT_API_SECRET` and ensure they belong to the same application.
- **OAuth redirect mismatch:** the callback in 42 and `FT_OAUTH_REDIRECT_URI` must match exactly, including protocol and path.
- **Personal calendar cannot be created:** verify `DATABASE_URL`, run the migration, and confirm Warsaw is the user’s primary campus.
- **Empty public calendar:** verify `FT_CAMPUS_ID` and the configured 42 application permission.
- **Old dates remain in Apple Calendar:** refresh subscribed calendars manually and check Apple’s automatic refresh setting.
- **Old private URL returns 410:** it was revoked or regenerated; subscribe using the new URL.
- **429 or temporary failure:** the 42 rate limit was reached; retry after it resets.
- **Wrong time:** feeds use UTC instants and Apple displays them in the device timezone.
