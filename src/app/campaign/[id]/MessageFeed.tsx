"use client";

import { useEffect, useRef, useState } from "react";
import type { Message } from "@/lib/types";

export function MessageFeed({
  messages,
  currentUserId,
  dmThinking,
  respondingNames,
  onSend,
  onTyping,
  canSpeak,
}: {
  messages: Message[];
  currentUserId: string;
  dmThinking: boolean;
  respondingNames: string[];
  onSend: (text: string) => Promise<void>;
  onTyping: (isResponding: boolean) => void;
  canSpeak: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, dmThinking, respondingNames.length]);

  function handleChange(value: string) {
    setDraft(value);
    onTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTyping(false), 2500);
  }

  async function submit() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft("");
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    onTyping(false);
    try {
      await onSend(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="dd-panel flex min-h-[60vh] flex-1 flex-col overflow-hidden rounded-2xl lg:min-h-0">
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto p-5"
        style={{ scrollBehavior: "smooth" }}
      >
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-center">
            <p className="max-w-sm text-sm text-parchment/50">
              The story has not yet begun. Describe what your hero does, and the
              Dungeon Master will set the scene.
            </p>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} currentUserId={currentUserId} />
        ))}

        {dmThinking && (
          <div className="dd-fade-up flex items-center gap-2 text-sm text-arcane-bright">
            <DotPulse />
            <span className="italic">The Dungeon Master is weaving the tale…</span>
          </div>
        )}
      </div>

      <div className="border-t border-white/5 p-3">
        {respondingNames.length > 0 && (
          <div className="mb-2 flex items-center gap-2 px-1 text-xs text-parchment/60">
            <DotPulse />
            <span>
              {respondingNames.slice(0, 3).join(", ")}
              {respondingNames.length > 3 ? " and others" : ""}{" "}
              {respondingNames.length === 1 ? "is" : "are"} responding…
            </span>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={() => onTyping(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            rows={2}
            disabled={!canSpeak}
            placeholder={
              canSpeak
                ? "Describe your action…  (Enter to send, Shift+Enter for a new line)"
                : "Join with a hero to act in this campaign."
            }
            className="max-h-40 min-h-[48px] flex-1 resize-none rounded-xl border border-gold/20 bg-black/30 px-4 py-3 text-parchment placeholder:text-parchment/30 outline-none transition focus:border-arcane focus:ring-2 focus:ring-arcane/30 disabled:opacity-50"
          />
          <button
            onClick={() => void submit()}
            disabled={!canSpeak || sending || !draft.trim()}
            className="h-[48px] shrink-0 rounded-xl bg-gradient-to-r from-ember to-ember-bright px-5 font-medium text-ink shadow-lg shadow-ember/20 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "…" : "Act"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  currentUserId,
}: {
  message: Message;
  currentUserId: string;
}) {
  if (message.sender_type === "system") {
    return (
      <div className="dd-fade-up flex justify-center">
        <span className="rounded-full border border-gold/15 bg-black/30 px-3 py-1 text-center text-xs italic text-gold/80">
          {message.content}
        </span>
      </div>
    );
  }

  if (message.sender_type === "dm") {
    return (
      <div className="dd-fade-up rounded-xl border-l-2 border-arcane bg-arcane/5 p-4">
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-arcane-bright">
          <span>✦ Dungeon Master</span>
        </div>
        <p className="whitespace-pre-wrap font-display text-[15px] leading-relaxed text-parchment/90">
          {message.content}
        </p>
      </div>
    );
  }

  const mine = message.user_id === currentUserId;
  return (
    <div className={`dd-fade-up flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          mine
            ? "rounded-br-sm bg-ember/15 text-parchment"
            : "rounded-bl-sm bg-white/5 text-parchment"
        }`}
      >
        <div className="mb-0.5 text-xs font-semibold text-gold">
          {message.character_name || "Adventurer"}
        </div>
        <p className="whitespace-pre-wrap text-[15px] leading-snug">
          {message.content}
        </p>
      </div>
    </div>
  );
}

function DotPulse() {
  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="dd-pulse h-1.5 w-1.5 rounded-full bg-arcane-bright"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </span>
  );
}
