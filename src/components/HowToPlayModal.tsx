"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HowToPlay } from "@/components/HowToPlay";

const AUTO_CLOSE_SECONDS = 30;

export function HowToPlayModal({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_CLOSE_SECONDS);

  useEffect(() => {
    dialogRef.current?.showModal();
    const interval = window.setInterval(() => {
      setSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0) dialogRef.current?.close();
  }, [secondsLeft]);

  return (
    <dialog
      aria-labelledby="how-to-play-modal-title"
      className="how-to-play-modal"
      onClose={onClose}
      ref={dialogRef}
    >
      <p className="eyebrow">You&apos;re in</p>
      <h2 id="how-to-play-modal-title">How to play</h2>
      <HowToPlay />
      <button className="primary-button" onClick={() => dialogRef.current?.close()} type="button">
        Let&apos;s go <span aria-hidden="true">→</span>
      </button>
      <div className="how-to-play-modal-footer">
        <Link className="secondary-link" href="/rules">Full rules</Link>
        <span aria-live="off">Closes in {secondsLeft}s</span>
      </div>
    </dialog>
  );
}
