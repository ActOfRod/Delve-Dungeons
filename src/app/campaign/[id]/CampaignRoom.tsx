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

  const [campaign, setCampaign] = useState(initialCampaign);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [rolls, setRolls] = useState<DiceRoll[]>(initialRolls);

  const [online, setOnline] = useState<Set<string>>(new Set());
  const [responding, setResponding] = useState<RespondingState>({});
  const [dmThinking, setDmThinking] = useState(false);

  const [, startTransition] = useTransition();

  const id = campaign.id;
  const isOwner = campaign.owner_id === currentUserId;
  const myCharacter = myMembership.character ?? null;
  const pendingCheck = campaign.pending_check as PendingCheck | null;

  const activeCharacterId = campaign.active_character_id;
  const isMyTurn =
    !!myCharacter && activeCharacterId === myCharacter.id;
  const amICheckTarget =
    !!pendingCheck && !!myCharacter && pendingCheck.character_id === myCharacter.id;

  const refetchMembers = useCallback(async () => {
    const { data } = await supabase
      .from("campaign_members")
      .select("*, character:characters(*), profile:profiles(*)")
      .eq("campaign_id", id)
      .order("turn_order", { ascending: true });
    if (data) setMembers(data as Member[]);
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

  // ---- Actions -------------------------------------------------------------
  const summonDM = useCallback(async () => {
    setDmThinking(true);
    broadcastDmThinking(true);
    try {
      await fetch("/api/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: id }),
      });
    } finally {
      broadcastDmThinking(false);
      // The DM message arriving via realtime clears the flag; clear locally too.
      setTimeout(() => setDmThinking(false), 500);
    }
  }, [id, broadcastDmThinking]);

  const handleSend = useCallback(
    async (text: string) => {
      broadcastResponding(false);
      await postMessage(
        id,
        text,
        myCharacter?.id ?? null,
        myCharacter?.name ?? null,
      );
      void summonDM();
    },
    [id, myCharacter?.id, myCharacter?.name, broadcastResponding, summonDM],
  );

  const handleAdvanceTurn = useCallback(() => {
    startTransition(async () => {
      await advanceTurn(id);
    });
  }, [id]);

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
    },
    [id, pendingCheck, myCharacter],
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

  return (
    <div className="flex min-h-dvh flex-col">
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
            <span className="hidden items-center gap-1.5 text-xs text-parchment/60 sm:flex">
              <span className="h-2 w-2 rounded-full bg-moss" />
              {online.size} online
            </span>
            <span className="rounded-full border border-gold/20 px-3 py-1 font-mono text-xs text-gold">
              {campaign.invite_code}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[1fr_320px]">
        {/* Main column: narrative + check stage + composer ------------------ */}
        <div className="flex min-h-0 flex-col gap-4">
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
            canSpeak={!!myCharacter}
          />
        </div>

        {/* Sidebar: party, turn order, dice ------------------------------- */}
        <aside className="flex flex-col gap-4">
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

          {isOwner && (
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
