# 42 iCalendar Bridge

A small, read-only calendar feed that brings every 42 Warsaw campus event into Apple Calendar.

The first working milestone is implemented: **the public Warsaw campus calendar**. A private feed containing only events a student joined is planned as the next milestone.

## What it does

- Fetches Warsaw events from the official 42 API.
- Includes events from 30 days ago through 365 days ahead.
- Converts them to a standards-compliant iCalendar feed.
- Publishes the feed at `/calendars/warsaw.ics`.
- Caches events for 15 minutes and automatically refreshes the 42 API access token.
- Does not expose the 42 API UID or secret to the browser.

## 1. Create a 42 API application

1. Sign in to the 42 API portal.
2. Open your API applications and create a new application.
3. For this public-calendar milestone, the website and redirect values are not used for login. You may use `http://localhost:3000` while developing.
4. Copy the application UID and secret. Treat the secret like a password.

## 2. Configure the project

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```dotenv
FT_API_UID=...
FT_API_SECRET=...
FT_CAMPUS_ID=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Verify the exact Warsaw campus ID instead of guessing it:

```bash
npm run verify:campus
```

Copy the returned `id` into `FT_CAMPUS_ID`. The same response should report the Warsaw timezone.

## 3. Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The calendar feed is available at:

```text
http://localhost:3000/calendars/warsaw.ics
```

Apple devices need a publicly reachable HTTPS URL for reliable ongoing refreshes, so use the deployed Vercel URL for the real subscription.

## 4. Deploy to Vercel

1. Push this repository to GitHub.
2. Import the repository in Vercel.
3. Add `FT_API_UID`, `FT_API_SECRET`, `FT_CAMPUS_ID`, and `NEXT_PUBLIC_SITE_URL` in the Vercel project environment settings.
4. Set `NEXT_PUBLIC_SITE_URL` to the final URL, for example `https://your-project.vercel.app`.
5. Redeploy after changing environment variables.

Never prefix the UID or secret with `NEXT_PUBLIC_`; that would expose it to browser code.

## Subscribe in Apple Calendar

### Mac

1. Open Calendar.
2. Choose **File → New Calendar Subscription**.
3. Paste `https://your-project.vercel.app/calendars/warsaw.ics`.
4. Choose **iCloud** as the location if you want the subscription on all your Apple devices.
5. Choose an automatic refresh interval.

### iPhone or iPad

1. Open Calendar and tap **Calendars**.
2. Tap **Add Calendar → Add Subscription Calendar**.
3. Paste the HTTPS feed URL.
4. Choose iCloud when offered.

Subscribed events are read-only. Join or leave events in 42 Intra.

## Checks

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

The tests parse the generated feed with an independent iCalendar parser and cover Unicode line folding, escaping, event validation, date filtering, and pagination.

## Troubleshooting

- **401 or “temporarily unavailable”:** verify the application UID and secret.
- **Empty calendar:** confirm `FT_CAMPUS_ID` is the Warsaw campus and that events exist in the configured date window.
- **Old events remain visible:** use **View → Refresh Calendars** on Mac and check the subscription auto-refresh setting.
- **Wrong event time:** events are emitted as UTC instants; Apple Calendar displays them in the device timezone.
- **429 errors:** the 42 API rate limit was reached. The endpoint returns a temporary error and succeeds again after the limit resets.

## Credential-dependent verification still required

The repository does not contain 42 credentials. After adding them, run `npm run verify:campus`, open `/calendars/warsaw.ics`, and subscribe to the deployed feed in Apple Calendar. No credential is required for the automated fixture-based test suite.
