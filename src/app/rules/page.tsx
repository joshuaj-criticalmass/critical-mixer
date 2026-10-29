import type { Metadata } from "next";
import Link from "next/link";
import { HowToPlay } from "@/components/HowToPlay";

export const metadata: Metadata = {
  title: "Rules | Critical Mixer",
};

export default function RulesPage() {
  return (
    <main className="page-shell">
      <header className="wordmark">
        <span className="brand-mark" aria-hidden="true">CM</span>
        <span>Critical Mixer</span>
      </header>
      <article className="rules-layout">
        <div className="intro rules-intro">
          <p className="eyebrow">London / 3-5 November 2026</p>
          <h1>The rules.</h1>
          <p className="intro-copy">
            Meet as many colleagues as you can. Every new person you meet earns
            you a point.
          </p>
        </div>

        <section className="rules-section" aria-labelledby="rules-start">
          <h2 id="rules-start">Getting started</h2>
          <ol className="rules-list">
            <li>Scan the poster QR code and enter your first and last name. A middle name is optional.</li>
            <li>
              <strong>Your name is your login.</strong> If you switch phones or clear your
              browser, just enter the same name again to pick up where you left off.
            </li>
            <li>
              <strong>No two players can have the same name.</strong> If someone already has
              yours, add your middle name or initial.
            </li>
          </ol>
        </section>

        <section className="rules-section" aria-labelledby="rules-how">
          <h2 id="rules-how">How to play</h2>
          <HowToPlay />
        </section>

        <section className="rules-section" aria-labelledby="rules-rules">
          <h2 id="rules-rules">The rules</h2>
          <ul className="rules-list">
            <li><strong>One point per person.</strong> You can only score with each colleague once.</li>
            <li><strong>Both of you have to scan.</strong> A meet only counts once you&apos;ve both scanned each other&apos;s codes, within 10 minutes.</li>
            <li><strong>Meet in person.</strong> Codes refresh every 30 seconds, so screenshots and forwarded codes won&apos;t work.</li>
            <li><strong>One player per person.</strong> Use your real name and don&apos;t make extra accounts.</li>
            <li><strong>Scanning only works while the game is live.</strong> The host starts and ends the game.</li>
          </ul>
        </section>

        <section className="rules-section" aria-labelledby="rules-board">
          <h2 id="rules-board">Leaderboard</h2>
          <ul className="rules-list">
            <li>Your phone shows your score, the top 3 scores, and how far you are from the top 3.</li>
            <li>The live board shows total meets and the top scores.</li>
            <li><strong>Names stay secret until the end.</strong></li>
          </ul>
        </section>

        <section className="rules-section" aria-labelledby="rules-win">
          <h2 id="rules-win">Winning</h2>
          <ul className="rules-list">
            <li><strong>Most points when the host ends the game on Thursday 5 November wins.</strong></li>
            <li><strong>If there&apos;s a tie, everyone tied for first is a winner.</strong></li>
            <li>Winners are revealed on the big screen.</li>
          </ul>
        </section>

        <section className="rules-section" aria-labelledby="rules-help">
          <h2 id="rules-help">Need help?</h2>
          <ul className="rules-list">
            <li><strong>Lost access?</strong> Enter the same name on the join screen and you&apos;ll be logged back in.</li>
            <li><strong>Still stuck?</strong> Find the host and they can get you back in.</li>
            <li><strong>Code expired?</strong> Ask them to hold their phone up again.</li>
          </ul>
        </section>

        <div className="rules-actions">
          <Link className="primary-button" href="/play">
            Back to my game <span aria-hidden="true">→</span>
          </Link>
          <Link className="secondary-link" href="/live">
            See the live board
          </Link>
        </div>
      </article>
      <footer className="page-footer">
        <span>Critical Mass</span>
        <span>3-5 November 2026</span>
      </footer>
    </main>
  );
}
