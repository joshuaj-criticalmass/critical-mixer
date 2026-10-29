"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const AUTO_CLOSE_SECONDS = 30;

// A modal that closes on its button, Escape, or by itself after 30 seconds.
export function AutoCloseModal({
  eyebrow,
  title,
  actionLabel,
  footer,
  onClose,
  children,
}: {
  eyebrow: string;
  title: string;
  actionLabel: string;
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
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
      aria-labelledby="auto-modal-title"
      className="auto-modal"
      onClose={onClose}
      ref={dialogRef}
    >
      <p className="eyebrow">{eyebrow}</p>
      <h2 id="auto-modal-title">{title}</h2>
      {children}
      <button className="primary-button" onClick={() => dialogRef.current?.close()} type="button">
        {actionLabel} <span aria-hidden="true">→</span>
      </button>
      <div className="auto-modal-footer">
        {footer ?? <span />}
        <span aria-live="off">Closes in {secondsLeft}s</span>
      </div>
    </dialog>
  );
}
