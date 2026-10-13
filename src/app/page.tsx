export default function Home() {
  return (
    <main className="page-shell">
      <header className="wordmark">
        <span className="brand-mark" aria-hidden="true">
          CM
        </span>
        <span>Critical Mass</span>
      </header>
      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">London / 3-5 November 2026</p>
        <h1 id="page-title">Critical Mixer</h1>
        <p className="intro-copy">
          Three days. One office. A few more reasons to say hello.
        </p>
      </section>
      <footer className="page-footer">
        <span>Critical Mass</span>
        <span>3-5 November 2026</span>
      </footer>
    </main>
  );
}