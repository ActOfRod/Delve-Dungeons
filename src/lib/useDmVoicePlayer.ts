"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "@/lib/types";

type QueueEntry = {
  id: string;
  text: string;
  base64?: string;
};

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

function playWavBlob(blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  return new Promise<void>((resolve, reject) => {
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
  const queueRef = useRef<QueueEntry[]>([]);
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
    async (entry: QueueEntry) => {
      try {
        if (entry.base64) {
          const binary = atob(entry.base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
          }
          await playWavBlob(new Blob([bytes], { type: "audio/wav" }));
          return;
        }

        const res = await fetch("/api/dm/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId, text: entry.text }),
        });

        if (res.ok) {
          await playWavBlob(await res.blob());
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

  const enqueue = useCallback(
    (entry: QueueEntry) => {
      if (!enabled) return;
      if (spokenIdsRef.current.has(entry.id)) return;
      if (queueRef.current.some((queued) => queued.id === entry.id)) return;
      spokenIdsRef.current.add(entry.id);
      queueRef.current.push(entry);
      void drainQueue();
    },
    [enabled, drainQueue],
  );

  const playPreparedAudio = useCallback(
    (messageId: string, audioWavBase64: string) => {
      enqueue({ id: messageId, text: "", base64: audioWavBase64 });
    },
    [enqueue],
  );

  const enqueueDmMessage = useCallback(
    (message: Message) => {
      if (message.sender_type !== "dm") return;
      enqueue({ id: message.id, text: message.content });
    },
    [enqueue],
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

  return { speaking, stopSpeaking, playPreparedAudio };
}
