"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AppNotification } from "@/lib/types";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

type FeedStore = {
  items: AppNotification[];
  listeners: Set<() => void>;
  channel: RealtimeChannel | null;
  refCount: number;
  pollId: ReturnType<typeof setInterval> | null;
};

const feeds = new Map<string, FeedStore>();

function getFeed(userId: string): FeedStore {
  let store = feeds.get(userId);
  if (!store) {
    store = {
      items: [],
      listeners: new Set(),
      channel: null,
      refCount: 0,
      pollId: null,
    };
    feeds.set(userId, store);
  }
  return store;
}

function emit(store: FeedStore) {
  store.listeners.forEach((l) => l());
}

async function fetchNotifications(
  supabase: SupabaseClient,
  userId: string,
): Promise<AppNotification[]> {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);
  return (data as AppNotification[] | null) ?? [];
}

function ensureRealtimeChannel(supabase: SupabaseClient, userId: string) {
  const store = getFeed(userId);
  if (store.channel) return;

  store.channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.eventType === "INSERT") {
          const n = payload.new as AppNotification;
          if (!store.items.some((x) => x.id === n.id)) {
            store.items = [n, ...store.items];
            emit(store);
          }
        } else if (payload.eventType === "UPDATE") {
          const n = payload.new as AppNotification;
          store.items = store.items.map((x) => (x.id === n.id ? n : x));
          emit(store);
        } else if (payload.eventType === "DELETE") {
          const old = payload.old as { id: string };
          store.items = store.items.filter((x) => x.id !== old.id);
          emit(store);
        }
      },
    )
    .subscribe();
}

function acquireFeed(userId: string) {
  const supabase = createClient();
  const store = getFeed(userId);
  store.refCount += 1;

  if (store.refCount === 1) {
    void fetchNotifications(supabase, userId).then((items) => {
      store.items = items;
      emit(store);
    });
    ensureRealtimeChannel(supabase, userId);
    store.pollId = setInterval(() => {
      void fetchNotifications(supabase, userId).then((items) => {
        store.items = items;
        emit(store);
      });
    }, 15000);
  }

  return () => {
    store.refCount -= 1;
    if (store.refCount > 0) return;

    if (store.pollId) {
      clearInterval(store.pollId);
      store.pollId = null;
    }
    if (store.channel) {
      void supabase.removeChannel(store.channel);
      store.channel = null;
    }
    store.items = [];
    store.listeners.clear();
    feeds.delete(userId);
  };
}

/** One shared notifications feed per user — safe for multiple bell instances. */
export function useNotificationFeed(userId: string) {
  const store = getFeed(userId);

  const items = useSyncExternalStore(
    (onStoreChange) => {
      store.listeners.add(onStoreChange);
      return () => store.listeners.delete(onStoreChange);
    },
    () => store.items,
    () => store.items,
  );

  useEffect(() => acquireFeed(userId), [userId]);

  const setItems = useCallback(
    (update: AppNotification[] | ((prev: AppNotification[]) => AppNotification[])) => {
      const feed = getFeed(userId);
      feed.items = typeof update === "function" ? update(feed.items) : update;
      emit(feed);
    },
    [userId],
  );

  const reload = useCallback(async () => {
    const supabase = createClient();
    const feed = getFeed(userId);
    feed.items = await fetchNotifications(supabase, userId);
    emit(feed);
  }, [userId]);

  return { items, setItems, reload };
}
