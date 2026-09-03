import Image from "next/image";
import { CopyButton } from "@/app/copy-button";
import { campusId, personalCalendarConfigured, siteUrl } from "@/lib/config";
import { readSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const httpsUrl = `${siteUrl()}/calendars/warsaw.ics`;
  const webcalUrl = httpsUrl.replace(/^https?:/, "webcal:");
  const session = await readSession();
  const personalReady = personalCalendarConfigured();
  const isWarsaw = session?.campusId === campusId();
  const personalUrl = session?.feedToken
    ? `${siteUrl()}/calendars/personal/${session.feedToken}.ics`
    : null;

  return (
    <main>
      <header className="masthead">
        <a className="wordmark" href="#top" aria-label="42iCalendar home">42iCalendar</a>
        <p>Campus calendar<br />Warsaw · PL</p>
        <p className="masthead-date">Events / Exams<br />Live feed</p>
      </header>

      <section className="hero" id="top" aria-labelledby="hero-title">
        <div className="sun sun-one" aria-hidden="true" />
        <div className="sun sun-two" aria-hidden="true" />
        <div className="blue-dot" aria-hidden="true">42</div>
        <Image className="ink-brush" src="/assets/ink-brush.png" alt="" width={1536} height={1024} priority />
        <p className="vertical-type" lang="ja" aria-hidden="true">予定</p>
        <div className="hero-copy">
          <p className="kicker">Automatic calendar subscription</p>
          <h1 id="hero-title"><span>Campus</span><span>time.</span><span>Captured.</span></h1>
          <p className="hero-note">Every Warsaw event.<br />Every scheduled exam.<br />One live calendar.</p>
        </div>
        <a className="hero-cta" href="#subscribe">Enter the feed <span aria-hidden="true">↓</span></a>
      </section>

      <section className="subscribe" id="subscribe" aria-labelledby="subscribe-title">
        <div className="section-index" aria-hidden="true"><span>01</span><span>同期</span></div>
        <div className="subscribe-copy">
          <p className="kicker">All campus dates</p>
          <h2 id="subscribe-title">Stop checking.<br />Start knowing.</h2>
          <p className="lede">Events and exams, pulled directly from 42. Subscribe once; new dates arrive automatically.</p>
        </div>
        <div className="action-panel">
          <p className="panel-label">Public calendar is live</p>
          <a className="primary" href={webcalUrl}>Subscribe in Apple Calendar <span>↗</span></a>
          <div className="secondary-actions">
            <CopyButton url={httpsUrl} />
            <a href={httpsUrl}>Open .ics feed</a>
          </div>
          <p className="privacy-note">Read-only · refreshed every 15 minutes · no login required</p>
        </div>
      </section>

      <section className="personal" id="personal" aria-labelledby="personal-title">
        <div className="section-index" aria-hidden="true"><span>02</span><span>参加</span></div>
        <div className="personal-copy">
          <p className="kicker">Your own signal</p>
          <h2 id="personal-title">You joined.<br />We mark it.</h2>
          <p className="lede">Your private calendar contains only events you joined in Intra. Every title starts with <strong>✓ YOU JOINED</strong>, so it stays distinct from the public feed.</p>
        </div>
        <div className="personal-panel">
          {!session && personalReady && (
            <>
              <p className="panel-label">Private calendar</p>
              <a className="primary" href="/auth/42/start">Continue with 42 <span>↗</span></a>
              <p>Sign in once to identify your subscribed events. Your OAuth token is discarded immediately after reading your profile.</p>
            </>
          )}
          {!session && !personalReady && (
            <>
              <p className="panel-label">Private calendar</p>
              <h3>Almost ready.</h3>
              <p>The private feed is built. OAuth and database environment variables still need to be connected in Vercel.</p>
            </>
          )}
          {session && !isWarsaw && (
            <>
              <p className="panel-label">Campus mismatch</p>
              <h3>Warsaw students only.</h3>
              <p>Your primary 42 campus is not Warsaw, so a personal link cannot be created.</p>
              <LogoutForm csrf={session.csrf} />
            </>
          )}
          {session && isWarsaw && !personalUrl && (
            <>
              <p className="panel-label">Signed in as {session.login}</p>
              <h3>Create your private feed.</h3>
              <p>Anyone with its secret URL can read your joined events. Keep it private.</p>
              <FeedAction csrf={session.csrf} action="create" label="Create private calendar" />
              <LogoutForm csrf={session.csrf} />
            </>
          )}
          {session && isWarsaw && personalUrl && (
            <>
              <p className="panel-label">Signed in as {session.login}</p>
              <a className="primary" href={personalUrl.replace(/^https?:/, "webcal:")}>Subscribe to joined events <span>↗</span></a>
              <div className="secondary-actions">
                <CopyButton url={personalUrl} />
                <a href={personalUrl}>Open .ics feed</a>
              </div>
              <div className="danger-actions">
                <FeedAction csrf={session.csrf} action="regenerate" label="New private link" />
                <FeedAction csrf={session.csrf} action="revoke" label="Revoke link" />
                <LogoutForm csrf={session.csrf} />
              </div>
            </>
          )}
        </div>
      </section>

      <section className="setup" aria-labelledby="setup-title">
        <div className="setup-heading">
          <p className="kicker">Three moves</p>
          <h2 id="setup-title">Set it.<br />Forget it.</h2>
        </div>
        <ol className="steps">
          <li><span>01</span><strong>Subscribe</strong><p>Choose the public calendar, your private joined-events calendar, or both.</p></li>
          <li><span>02</span><strong>Choose iCloud</strong><p>Save it to iCloud so the same calendar appears on Mac, iPhone and iPad.</p></li>
          <li><span>03</span><strong>Stay current</strong><p>Apple Calendar refreshes the feed. Joining or leaving still happens in Intra.</p></li>
        </ol>
      </section>

      <footer><p>42iCalendar</p><p>Warsaw · Poland</p></footer>
    </main>
  );
}

function FeedAction({ csrf, action, label }: { csrf: string; action: "create" | "regenerate" | "revoke"; label: string }) {
  return (
    <form action="/personal/feed" method="post">
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="action" value={action} />
      <button type="submit">{label}</button>
    </form>
  );
}

function LogoutForm({ csrf }: { csrf: string }) {
  return (
    <form action="/auth/logout" method="post">
      <input type="hidden" name="csrf" value={csrf} />
      <button type="submit">Log out</button>
    </form>
  );
}
