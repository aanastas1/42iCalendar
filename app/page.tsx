import Image from "next/image";
import { CopyButton } from "@/app/copy-button";
import { siteUrl } from "@/lib/config";

export default function Home() {
  const httpsUrl = `${siteUrl()}/calendars/warsaw.ics`;
  const webcalUrl = httpsUrl.replace(/^https?:/, "webcal:");

  return (
    <main>
      <header className="masthead">
        <a className="logo-lockup" href="#top" aria-label="42 Warsaw calendar home">
          <Image src="/assets/42-warsaw-logo.png" alt="42 Warsaw" width={447} height={447} priority />
        </a>
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
          <p className="kicker">42 Warsaw × Apple Calendar</p>
          <h2 id="subscribe-title">Stop checking.<br />Start knowing.</h2>
          <p className="lede">The feed pulls campus events and exams directly from 42. Subscribe once; new dates arrive automatically.</p>
        </div>
        <div className="action-panel">
          <p className="panel-label">Calendar is live</p>
          <a className="primary" href={webcalUrl}>Subscribe in Apple Calendar <span>↗</span></a>
          <div className="secondary-actions">
            <CopyButton url={httpsUrl} />
            <a href={httpsUrl}>Open .ics feed</a>
          </div>
          <div className="url-strip" title={httpsUrl}>{httpsUrl}</div>
          <p className="privacy-note">Read-only · refreshed every 15 minutes · no login required</p>
        </div>
      </section>

      <section className="setup" aria-labelledby="setup-title">
        <div className="setup-heading">
          <p className="kicker">Three moves</p>
          <h2 id="setup-title">Set it.<br />Forget it.</h2>
        </div>
        <ol className="steps">
          <li><span>01</span><strong>Subscribe</strong><p>Tap the red button or paste the feed URL into a new calendar subscription.</p></li>
          <li><span>02</span><strong>Choose iCloud</strong><p>Save it to iCloud so the same calendar appears on Mac, iPhone and iPad.</p></li>
          <li><span>03</span><strong>Stay current</strong><p>Apple Calendar refreshes the feed. Joining or leaving still happens in Intra.</p></li>
        </ol>
      </section>

      <footer>
        <p>42 Warsaw Calendar Bridge</p>
        <p>Public events + exams</p>
        <p>Personal joined-events feed — next</p>
      </footer>
    </main>
  );
}
