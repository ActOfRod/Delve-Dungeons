"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import { DmVoiceToggle } from "@/components/DmVoiceToggle";
import { useDmVoicePlayer } from "@/lib/useDmVoicePlayer";
import type {
  Campaign,
  CampaignMember,
  Character,
  DiceRoll,
  Message,
  PendingCheck,
  Profile,
} from "@/lib/types";
import { abilityModifier, type AbilityKey } from "@/lib/dnd";
import {
  advanceTurn,
  postMessage,
  setActiveCharacter,
  setDmVoiceEnabled,
  submitRoll,
} from "./actions";
import { MessageFeed } from "./MessageFeed";
import { PartyPanel } from "./PartyPanel";
import { DiceLog } from "./DiceLog";
import { CheckStage } from "./CheckStage";
import { DiceTray } from "./DiceTray";
import { DMCheckControls } from "./DMCheckControls";

type Member = CampaignMember & {
  character?: Character | null;
  profile?: Profile | null;
};

interface RespondingState {
  [userId: string]: { name: string; at: number };
}

export function CampaignRoom({
  initialCampaign,
  currentUserId,
  myMembership,
  initialMembers,
  initialMessages,
  initialRolls,
}: {
  initialCampaign: Campaign;
  currentUserId: string;
  myMembership: Member;
  initialMembers: Member[];
  initialMessages: Message[];
  initialRolls: DiceRoll[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const openingRequestedRef = useRef(false);

  const [campaign, setCampaign] = useState(initialCampaign);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [rolls, setRolls] = useState<DiceRoll[]>(initialRolls);

  const [online, setOnline] = useState<Set<string>>(new Set());
  const [responding, setResponding] = useState<RespondingState>({});
  const [dmThinking, setDmThinking] = useState(false);

  const [, startTransition] = useTransition();

  const id = campaign.id;
  const isHumanDm = myMembership.role === "dm";
  const dmVoiceEnabled = campaign.dm_voice_enabled ?? false;
  const myCharacter = useMemo(() => {
    const fromTable = members.find((m) => m.user_id === currentUserId)?.character;
    return fromTable ?? myMembership.character ?? null;
  }, [members, currentUserId, myMembership.character]);
  const pendingCheck = campaign.pending_check as PendingCheck | null;

  const activeCharacterId = campaign.active_character_id;
  const isMyTurn =
    !!myCharacter && activeCharacterId === myCharacter.id;
  const amICheckTarget =
    !!pendingCheck && !!myCharacter && pendingCheck.character_id === myCharacter.id;

  const refetchMembers = useCallback(async () => {
    // profiles can't be embedded (no FK), so fetch members then merge profiles.
    const { data } = await supabase
      .from("campaign_members")
      .select("*, character:characters(*)")
      .eq("campaign_id", id)
      .order("turn_order", { ascending: true });
    if (!data) return;
    const rows = data as Member[];
    const userIds = rows.map((m) => m.user_id);
    const { data: profiles } = userIds.length
      ? await supabase
          .from("profiles")
          .select("id, display_name, friend_code")
          .in("id", userIds)
      : { data: [] };
    const byId = new Map(
      ((profiles as Profile[]) ?? []).map((p) => [p.id, p]),
    );
    setMembers(rows.map((m) => ({ ...m, profile: byId.get(m.user_id) ?? null })));
  }, [supabase, id]);

  // ---- Realtime wiring -----------------------------------------------------
  useEffect(() => {
    const channel = supabase.channel(`room:${id}`, {
      config: { presence: { key: currentUserId } },
    });
    channelRef.current = channel;

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `campaign_id=eq.${id}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
          );
          if (msg.sender_type === "dm") setDmThinking(false);
          if (msg.sender_type === "system" && /gained \d+ XP/i.test(msg.content)) {
            void refetchMembers();
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "characters",
        },
        () => {
          void refetchMembers();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dice_rolls",
          filter: `campaign_id=eq.${id}`,
        },
        (payload) => {
          const roll = payload.new as DiceRoll;
          setRolls((prev) =>
            prev.some((r) => r.id === roll.id) ? prev : [roll, ...prev],
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "campaigns",
          filter: `id=eq.${id}`,
        },
        (payload) => setCampaign(payload.new as Campaign),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaign_members",
          filter: `campaign_id=eq.${id}`,
        },
        () => {
          void refetchMembers();
        },
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnline(new Set(Object.keys(state)));
      })
      .on("broadcast", { event: "responding" }, ({ payload }) => {
        const { userId, name, isResponding } = payload as {
          userId: string;
          name: string;
          isResponding: boolean;
        };
        if (userId === currentUserId) return;
        setResponding((prev) => {
          const next = { ...prev };
          if (isResponding) next[userId] = { name, at: Date.now() };
          else delete next[userId];
          return next;
        });
      })
      .on("broadcast", { event: "dm_thinking" }, ({ payload }) => {
        setDmThinking(Boolean((payload as { thinking: boolean }).thinking));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: currentUserId,
            character_name: myCharacter?.name ?? "Spectator",
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [supabase, id, currentUserId, myCharacter?.name, refetchMembers]);

  // Expire stale "responding" indicators.
  useEffect(() => {
    const interval = setInterval(() => {
      setResponding((prev) => {
        const now = Date.now();
        let changed = false;
        const next: RespondingState = {};
        for (const [uid, v] of Object.entries(prev)) {
          if (now - v.at < 6000) next[uid] = v;
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const broadcastResponding = useCallback(
    (isResponding: boolean) => {
      channelRef.current?.send({
        type: "broadcast",
        event: "responding",
        payload: {
          userId: currentUserId,
          name: myCharacter?.name ?? "A player",
          isResponding,
        },
      });
    },
    [currentUserId, myCharacter?.name],
  );

  const broadcastDmThinking = useCallback((thinking: boolean) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "dm_thinking",
      payload: { thinking },
    });
  }, []);

  const { speaking: dmSpeaking, stopSpeaking: stopDmVoice, playPreparedAudio } =
    useDmVoicePlayer({
      campaignId: id,
      enabled: dmVoiceEnabled && !isHumanDm,
      messages,
    });

  // ---- Actions -------------------------------------------------------------
  const summonDM = useCallback(
    async (options?: {
      opening?: boolean;
      checkResult?: boolean;
    }): Promise<boolean> => {
      setDmThinking(true);
      broadcastDmThinking(true);
      let checkRequested = false;
      try {
        const res = await fetch("/api/dm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: id,
            opening: options?.opening,
            checkResult: options?.checkResult,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            message?: { id: string };
            check?: unknown;
            audioWavBase64?: string;
          };
          checkRequested = Boolean(data.check);
          if (dmVoiceEnabled && !isHumanDm && data.message?.id && data.audioWavBase64) {
            playPreparedAudio(data.message.id, data.audioWavBase64);
          }
        }
        return checkRequested;
      } finally {
        broadcastDmThinking(false);
        setTimeout(() => setDmThinking(false), 500);
      }
    },
    [id, broadcastDmThinking, dmVoiceEnabled, isHumanDm, playPreparedAudio],
  );

  const applySpotlight = useCallback((nextCharacterId: string | null) => {
    setCampaign((prev) => ({
      ...prev,
      active_character_id: nextCharacterId,
      pending_check: null,
    }));
  }, []);

  const maybeAdvanceTurnAfterAction = useCallback(
    async (checkRequested: boolean) => {
      if (checkRequested || !myCharacter) return;
      const playersWithHeroes = members.filter((m) => m.character_id);
      if (playersWithHeroes.length < 2) return;
      if (activeCharacterId !== myCharacter.id) return;
      const { nextCharacterId, error } = await advanceTurn(id);
      if (!error && nextCharacterId) {
        applySpotlight(nextCharacterId);
      }
    },
    [members, myCharacter, activeCharacterId, id, applySpotlight],
  );

  // AI DM tables open with a generated scene instead of waiting for input.
  useEffect(() => {
    if (messages.length > 0 || isHumanDm || openingRequestedRef.current) return;
    openingRequestedRef.current = true;
    void summonDM({ opening: true });
  }, [messages.length, isHumanDm, summonDM]);

  const handleSend = useCallback(
    async (text: string) => {
      broadcastResponding(false);
      await postMessage(
        id,
        text,
        myCharacter?.id ?? null,
        myCharacter?.name ?? null,
      );
      if (isHumanDm) {
        if (!pendingCheck) {
          await maybeAdvanceTurnAfterAction(false);
        }
        return;
      }
      const checkRequested = await summonDM();
      await maybeAdvanceTurnAfterAction(checkRequested);
    },
    [
      id,
      myCharacter?.id,
      myCharacter?.name,
      broadcastResponding,
      summonDM,
      isHumanDm,
      pendingCheck,
      maybeAdvanceTurnAfterAction,
    ],
  );

  const handleAdvanceTurn = useCallback(() => {
    startTransition(async () => {
      const { nextCharacterId, error } = await advanceTurn(id);
      if (!error && nextCharacterId) {
        applySpotlight(nextCharacterId);
      }
    });
  }, [id, applySpotlight]);

  const handleClaimSpotlight = useCallback(() => {
    if (!myCharacter) return;
    startTransition(async () => {
      await setActiveCharacter(id, myCharacter.id);
    });
  }, [id, myCharacter]);

  // Resolve a pending skill check on behalf of the current player.
  const handleResolveCheck = useCallback(
    async (rolls: number[], total: number, modifier: number) => {
      if (!pendingCheck || !myCharacter) return;
      const success = total >= pendingCheck.dc;
      await submitRoll(id, {
        characterId: myCharacter.id,
        characterName: myCharacter.name,
        notation: "1d20",
        rolls,
        modifier,
        total,
        skill: pendingCheck.skill,
        dc: pendingCheck.dc,
        success,
        resolvesPendingCheck: true,
      });
      if (!isHumanDm) {
        const checkRequested = await summonDM({ checkResult: true });
        await maybeAdvanceTurnAfterAction(checkRequested);
      } else {
        await maybeAdvanceTurnAfterAction(false);
      }
    },
    [
      id,
      pendingCheck,
      myCharacter,
      isHumanDm,
      summonDM,
      maybeAdvanceTurnAfterAction,
    ],
  );

  const handleGenericRoll = useCallback(
    async (notation: string, rolls: number[], modifier: number, total: number) => {
      await submitRoll(id, {
        characterId: myCharacter?.id ?? null,
        characterName: myCharacter?.name ?? "Spectator",
        notation,
        rolls,
        modifier,
        total,
      });
    },
    [id, myCharacter],
  );

  const checkModifier = useMemo(() => {
    if (!pendingCheck || !myCharacter) return 0;
    const ability = pendingCheck.ability as AbilityKey;
    const score = myCharacter.abilities?.[ability] ?? 10;
    return abilityModifier(score);
  }, [pendingCheck, myCharacter]);

  const respondingNames = Object.values(responding).map((r) => r.name);

  const handleDmVoiceToggle = useCallback(
    (enabled: boolean) => {
      setCampaign((prev) => ({ ...prev, dm_voice_enabled: enabled }));
      startTransition(async () => {
        await setDmVoiceEnabled(id, enabled);
      });
    },
    [id],
  );

  const composePlaceholder = useMemo(() => {
    if (!myCharacter) {
      return "Join with a hero to act in this campaign.";
    }
    if (pendingCheck) {
      return "Resolve the skill check before acting again…";
    }
    if (!isMyTurn) {
      const active = members.find(
        (m) => m.character_id === activeCharacterId,
      )?.character?.name;
      return active
        ? `Wait for your turn — ${active} is in the spotlight.`
        : "Wait for your turn in the initiative order.";
    }
    return "Describe your action…  (Enter to send, Shift+Enter for a new line)";
  }, [myCharacter, pendingCheck, isMyTurn, members, activeCharacterId]);

  const canCompose = !!myCharacter && isMyTurn && !pendingCheck;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-parchment/60 hover:text-parchment">
              <Logo />
            </Link>
            <div className="hidden border-l border-white/10 pl-4 sm:block">
              <h1 className="font-display text-lg leading-tight text-gold">
                {campaign.name}
              </h1>
              {campaign.setting && (
                <p className="text-xs text-parchment/50">{campaign.setting}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isHumanDm && (
              <DmVoiceToggle
                enabled={dmVoiceEnabled}
                speaking={dmSpeaking}
                onToggle={handleDmVoiceToggle}
                onStop={stopDmVoice}
              />
            )}
            <span className="hidden items-center gap-1.5 text-xs text-parchment/60 sm:flex">
              <span className="h-2 w-2 rounded-full bg-moss" />
              {online.size} online
            </span>
            <span className="rounded-full border border-gold/20 px-3 py-1 font-mono text-xs text-gold">
              {campaign.invite_code}
            </span>
            <NotificationBell userId={currentUserId} />
          </div>
        </div>
      </header>

      <div className="mx-auto grid h-0 min-h-0 w-full max-w-7xl flex-1 grid-cols-1 gap-4 overflow-hidden px-4 py-4 sm:px-6 lg:grid-cols-[1fr_320px]">
        {/* Main column: narrative + check stage + composer ------------------ */}
        <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
          <CheckStage
            key={pendingCheck?.requested_at ?? "none"}
            pendingCheck={pendingCheck}
            amITarget={amICheckTarget}
            modifier={checkModifier}
            onResolve={handleResolveCheck}
          />
          <MessageFeed
            messages={messages}
            currentUserId={currentUserId}
            dmThinking={dmThinking}
            respondingNames={respondingNames}
            onSend={handleSend}
            onTyping={broadcastResponding}
            canCompose={canCompose}
            composePlaceholder={composePlaceholder}
            awaitingOpening={!isHumanDm && messages.length === 0}
          />
        </div>

        {/* Sidebar: party, turn order, dice ------------------------------- */}
        <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto lg:overflow-y-auto">
          <PartyPanel
            members={members}
            online={online}
            activeCharacterId={activeCharacterId}
            currentUserId={currentUserId}
            isMyTurn={isMyTurn}
            hasCharacter={!!myCharacter}
            onAdvanceTurn={handleAdvanceTurn}
            onClaimSpotlight={handleClaimSpotlight}
          />

          {isHumanDm && (
            <DMCheckControls
              campaignId={id}
              members={members}
              activeCharacterId={activeCharacterId}
            />
          )}

          <DiceTray onRoll={handleGenericRoll} />

          <DiceLog rolls={rolls} />
        </aside>
      </div>
    </div>
  );
}
