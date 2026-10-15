"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { WrappedData } from "@/lib/wrapped";

type Slide =
  | { type: "intro" }
  | { type: "players" }
  | { type: "meets" }
  | { type: "peak" }
  | { type: "tier"; place: 3 | 2 }
  | { type: "drumroll" }
  | { type: "winners" };

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    let start: number | null = null;
    const duration = 900;
    const animate = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{displayValue.toLocaleString("en-GB")}</>;
}

function makeSlides(data: WrappedData): Slide[] {
  const slides: Slide[] = [
    { type: "intro" },
    { type: "players" },
    { type: "meets" },
    { type: "peak" },
  ];
  if (data.top3.length >= 3) slides.push({ type: "tier", place: 3 });
  if (data.top3.length >= 2) slides.push({ type: "tier", place: 2 });
  slides.push({ type: "drumroll" }, { type: "winners" });
  return slides;
}

export default function RevealPage() {
  const [wrapped, setWrapped] = useState<WrappedData | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const key = sessionStorage.getItem("cmx:admin-key") ?? "";
    if (!key) {
      setIsLoading(false);
      setError("Unlock host tools first, then open the reveal.");
      return;
    }

    let cancelled = false;
    void fetch("/api/admin/wrapped", {
      headers: { "x-admin-key": key },
      cache: "no-store",
    }).then(async (response) => {
      const result = await response.json() as WrappedData & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Reveal data unavailable.");
      if (!cancelled) setWrapped(result);
    }).catch((caught: unknown) => {
      if (!cancelled) setError(caught instanceof Error ? caught.message : "Reveal data unavailable.");
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const slides = wrapped ? makeSlides(wrapped) : [];
  const slide = slides[slideIndex];

  function previousSlide() {
    setSlideIndex((index) => Math.max(0, index - 1));
  }

  function nextSlide() {
    setSlideIndex((index) => Math.min(slides.length - 1, index + 1));
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "ArrowRight" || event.key === " " || event.key === "PageDown") {
        event.preventDefault();
        nextSlide();
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        previousSlide();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (isLoading || error || !wrapped || !slide) {
    return (
      <main className="reveal-gate">
        <span className="brand-mark" aria-hidden="true">CM</span>
        <p className="eyebrow">Critical Mixer · Host reveal</p>
        <h1>{isLoading ? "Loading the story…" : "Reveal is not ready."}</h1>
        <p role={error ? "alert" : "status"}>{error || "No reveal data is available."}</p>
        <Link className="secondary-link" href="/admin">Back to host tools</Link>
      </main>
    );
  }

  const thirdTier = wrapped.top3[2];
  const secondTier = wrapped.top3[1];
  const maxHourCount = Math.max(1, ...wrapped.hourly.map((hour) => hour.meets));

  return (
    <main className={`reveal-screen reveal-slide reveal-${slide.type}`} key={slideIndex}>
      <header className="reveal-header">
        <span className="reveal-brand"><span className="brand-mark" aria-hidden="true">CM</span> Critical Mixer</span>
        <span>{slideIndex + 1} / {slides.length}</span>
      </header>

      <section className="reveal-content" aria-live="polite">
        {slide.type === "intro" && (
          <>
            <p className="eyebrow">London · 3–5 November 2026</p>
            <h1>Critical Mixer</h1>
            <p className="reveal-subtitle">Three days. One team. One office.</p>
          </>
        )}
        {slide.type === "players" && (
          <>
            <p className="eyebrow">Every hello counts</p>
            <p className="reveal-number"><AnimatedNumber value={wrapped.players} /></p>
            <h1>of you joined in.</h1>
          </>
        )}
        {slide.type === "meets" && (
          <>
            <p className="eyebrow">New connections</p>
            <p className="reveal-number"><AnimatedNumber value={wrapped.meets} /></p>
            <h1>meets made.</h1>
          </>
        )}
        {slide.type === "peak" && (
          <>
            <p className="eyebrow">Peak mingling</p>
            <h1>{wrapped.peakHour?.label ?? "Every hour had room for a hello."}</h1>
            {wrapped.peakHour && <p className="reveal-subtitle">{wrapped.peakHour.meets} confirmed meets</p>}
            <div className="reveal-hour-chart" aria-label="Confirmed meets by hour">
              {wrapped.hourly.map((hour) => (
                <span
                  aria-label={`${hour.label}: ${hour.meets} meets`}
                  className={hour.meets > 0 ? "reveal-hour-bar reveal-hour-bar-active" : "reveal-hour-bar"}
                  key={hour.bucket}
                  style={{ height: `${Math.max(3, hour.meets / maxHourCount * 100)}%` }}
                  title={`${hour.label}: ${hour.meets}`}
                />
              ))}
            </div>
          </>
        )}
        {slide.type === "tier" && (
          <>
            <p className="eyebrow">The chase</p>
            <p className="reveal-place">{slide.place === 3 ? "Third" : "Second"} place</p>
            <p className="reveal-number">{(slide.place === 3 ? thirdTier : secondTier)?.points ?? 0}</p>
            <p className="reveal-subtitle">points</p>
            <div className="reveal-tier-names">
              {(slide.place === 3 ? thirdTier : secondTier)?.players.map((player) => (
                <span key={player.id}>{player.name}</span>
              ))}
            </div>
          </>
        )}
        {slide.type === "drumroll" && (
          <>
            <p className="eyebrow">One last moment</p>
            <h1>And the winner is…</h1>
          </>
        )}
        {slide.type === "winners" && (
          <>
            <p className="eyebrow">{wrapped.winners.length > 1 ? "It's a tie!" : "Our winner"}</p>
            <div className="reveal-winners">
              {wrapped.winners.map((winner, index) => (
                <article className="reveal-winner" key={`${winner.name}-${index}`}>
                  <h1>{winner.name}</h1>
                  <p>{winner.points} pts</p>
                </article>
              ))}
              {wrapped.winners.length === 0 && <p>No winner data is available yet.</p>}
            </div>
          </>
        )}
      </section>

      <footer className="reveal-controls">
        <button disabled={slideIndex === 0} onClick={previousSlide} type="button">← Back</button>
        <div className="reveal-progress" aria-label={`Slide ${slideIndex + 1} of ${slides.length}`}>
          {slides.map((item, index) => (
            <span aria-current={index === slideIndex ? "step" : undefined} className={index <= slideIndex ? "is-seen" : ""} key={`${item.type}-${index}`} />
          ))}
        </div>
        <button disabled={slideIndex === slides.length - 1} onClick={nextSlide} type="button">
          {slideIndex === slides.length - 1 ? "End" : "Next →"}
        </button>
      </footer>
    </main>
  );
}