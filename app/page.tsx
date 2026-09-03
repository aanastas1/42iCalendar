import { siteUrl } from "@/lib/config";

export default function Home() {
  const httpsUrl = `${siteUrl()}/calendars/warsaw.ics`;
  const webcalUrl = httpsUrl.replace(/^https?:/, "webcal:");

  return (
    <main>
      <header className="hero">
        <div className="mark" aria-hidden="true">42</div>
        <div>
          <p className="eyebrow">Warsaw campus</p>
          <h1>Put every 42 event in your calendar.</h1>
          <p className="intro">
            One read-only subscription. New campus events appear automatically—no copying, no missed workshops.
          </p>
        </div>
      </header>

      <section className="card" aria-labelledby="all-events-title">
        <div className="badge">Live calendar</div>
        <h2 id="all-events-title">All 42 Warsaw events</h2>
        <p>Includes every event published for the Warsaw campus, whether or not you joined it in Intra.</p>
        <div className="actions">
          <a className="primary" href={webcalUrl}>Subscribe in Apple Calendar</a>
          <a className="secondary" href={httpsUrl}>Open calendar feed</a>
        </div>
        <label htmlFor="feed-url">Subscription URL</label>
        <input id="feed-url" readOnly value={httpsUrl} />
      </section>

      <section className="instructions" aria-labelledby="instructions-title">
        <p className="eyebrow">Setup</p>
        <h2 id="instructions-title">Two quick ways to subscribe</h2>
        <div className="steps">
          <article><span>Mac</span><p>Calendar → File → New Calendar Subscription, then paste the URL above.</p></article>
          <article><span>iPhone / iPad</span><p>Calendar → Calendars → Add Calendar → Add Subscription Calendar.</p></article>
          <article><span>Every device</span><p>Choose iCloud as the calendar location so the subscription follows your Apple Account.</p></article>
        </div>
      </section>

      <footer>
        <p>This calendar is read-only. Join or leave events in 42 Intra.</p>
        <p>Personal “events I joined” subscriptions are the next milestone.</p>
      </footer>
    </main>
  );
}
