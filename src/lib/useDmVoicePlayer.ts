"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "@/lib/types";

function speakWithBrowser(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 0.9;
    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error("Browser speech failed"));
    window.speechSynthesis.speak(utterance);
  });
}

export function useDmVoicePlayer({
  campaignId,
  enabled,
  messages,
}: {
  campaignId: string;
  enabled: boolean;
  messages: Message[];
}) {
  const [speaking, setSpeaking] = useState(false);
  const spokenIdsRef = useRef(new Set<string>());
  const queueRef = useRef<{ id: string; text: string }[]>([]);
  const playingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    for (const message of messages) {
      if (message.sender_type === "dm") {
        spokenIdsRef.current.add(message.id);
      }
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    queueRef.current = [];
    playingRef.current = false;
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
    setSpeaking(false);
  }, []);

  const playEntry = useCallback(
    async (entry: { id: string; text: string }) => {
      try {
        const res = await fetch("/api/dm/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId, text: entry.text }),
        });

        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioRef.current = audio;
          await new Promise<void>((resolve, reject) => {
            audio.onended = () => {
              URL.revokeObjectURL(url);
              resolve();
            };
            audio.onerror = () => {
              URL.revokeObjectURL(url);
              reject(new Error("Audio playback failed"));
            };
            void audio.play().catch(reject);
          });
          return;
        }

        await speakWithBrowser(entry.text.replace(/\[CHECK:[^\]]+\]/gi, "").trim());
      } catch (err) {
        console.warn("[dm-voice] Playback failed:", err);
      }
    },
    [campaignId],
  );

  const drainQueue = useCallback(async () => {
    if (playingRef.current) return;
    const next = queueRef.current.shift();
    if (!next) {
      setSpeaking(false);
      return;
    }

    playingRef.current = true;
    setSpeaking(true);
    try {
      await playEntry(next);
    } finally {
      playingRef.current = false;
      void drainQueue();
    }
  }, [playEntry]);

  const enqueueDmMessage = useCallback(
    (message: Message) => {
      if (!enabled || message.sender_type !== "dm") return;
      if (spokenIdsRef.current.has(message.id)) return;
      spokenIdsRef.current.add(message.id);
      queueRef.current.push({ id: message.id, text: message.content });
      void drainQueue();
    },
    [enabled, drainQueue],
  );

  useEffect(() => {
    if (!enabled) {
      stopSpeaking();
      return;
    }
    const last = messages[messages.length - 1];
    if (last?.sender_type === "dm") {
      enqueueDmMessage(last);
    }
  }, [messages, enabled, enqueueDmMessage, stopSpeaking]);

  useEffect(() => () => stopSpeaking(), [stopSpeaking]);

  return { speaking, stopSpeaking };
}
