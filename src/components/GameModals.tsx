"use client";

import Link from "next/link";
import { AutoCloseModal } from "@/components/AutoCloseModal";
import { HowToPlay } from "@/components/HowToPlay";

export function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <AutoCloseModal
      actionLabel="Let's go"
      eyebrow="You're in"
      footer={<Link className="secondary-link" href="/rules">Full rules</Link>}
      onClose={onClose}
      title="How to play"
    >
      <HowToPlay />
    </AutoCloseModal>
  );
}

export function IcebreakerModal({
  name,
  question,
  onClose,
}: {
  name: string;
  question: string;
  onClose: () => void;
}) {
  return (
    <AutoCloseModal
      actionLabel="Got it"
      eyebrow={`You met ${name} · +1 point`}
      onClose={onClose}
      title="Icebreaker"
    >
      <blockquote className="icebreaker-question">{question}</blockquote>
    </AutoCloseModal>
  );
}
