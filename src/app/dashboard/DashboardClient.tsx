"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Campaign, CampaignMember, Character } from "@/lib/types";
import { Modal } from "@/components/Modal";
import { KebabMenu } from "@/components/KebabMenu";
import { CharacterForm } from "./CharacterForm";
import { CampaignForm } from "./CampaignForm";
import { JoinForm } from "./JoinForm";
import { CharacterInspect } from "./CharacterInspect";
import { deleteCampaign, deleteCharacter } from "./actions";
import { abilityModifier, formatModifier } from "@/lib/dnd";

export type FriendOption = { userId: string; displayName: string | null };

type CampaignEntry = { membership: CampaignMember; campaign: Campaign };

export function DashboardClient({
  currentUserId,
  characters,
  campaigns,
  friends,
  vaultItemCount = 0,
}: {
  currentUserId: string;
  characters: Character[];
  campaigns: CampaignEntry[];
  friends: FriendOption[];
  vaultItemCount?: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showCharacter, setShowCharacter] = useState(false);
  const [showCampaign, setShowCampaign] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [inspecting, setInspecting] = useState<Character | null>(null);
  const [campaignFormKey, setCampaignFormKey] = useState(0);

  const busyCharacterIds = useMemo(
    () =>
      new Set(
        campaigns
          .map((e) => e.membership.character_id)
          .filter((id): id is string => id != null),
      ),
    [campaigns],
  );

  // Open the join modal pre-filled when arriving from a campaign invite.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("join");
    if (code) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setJoinCode(code.toUpperCase());
      setShowJoin(true);
      /* eslint-enable react-hooks/set-state-in-effect */
      // Clean the URL so refreshes don't re-open the modal.
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  function handleDeleteCampaign(entry: CampaignEntry) {
    const isCampaignOwner = entry.campaign.owner_id === currentUserId;
    const msg = isCampaignOwner
      ? `Close "${entry.campaign.name}"? This deletes it for everyone and notifies the other players.`
      : `Leave "${entry.campaign.name}"?`;
    if (!window.confirm(msg)) return;
    startTransition(async () => {
      await deleteCampaign(entry.campaign.id);
      router.refresh();
    });
  }

  function handleDeleteCharacter(c: Character) {
    if (!window.confirm(`Delete ${c.name}? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteCharacter(c.id);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Campaigns ---------------------------------------------------------- */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h1 className="font-display text-2xl text-parchment">Your campaigns</h1>
            <p className="text-sm text-parchment/60">
              Jump back into an adventure or start a new one.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setJoinCode("");
                setShowJoin(true);
              }}
              className="rounded-full border border-gold/30 px-4 py-2 text-sm text-parchment transition hover:border-gold/60 hover:bg-gold/10"
            >
              Join with code
            </button>
            <button
              onClick={() => {
                setCampaignFormKey((k) => k + 1);
                setShowCampaign(true);
              }}
              className="rounded-full bg-gradient-to-r from-arcane to-arcane-bright px-4 py-2 text-sm font-medium text-ink transition hover:scale-[1.02]"
            >
              + New campaign
            </button>
          </div>
        </div>

        {campaigns.length === 0 ? (
          <EmptyState
            icon="🗺️"
            title="No campaigns yet"
            body="Create a campaign to summon the AI Dungeon Master, or join a friend's table with an invite code."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((entry) => (
              <CampaignCard
                key={entry.campaign.id}
                entry={entry}
                currentUserId={currentUserId}
                onDelete={() => handleDeleteCampaign(entry)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Heroes & stash ------------------------------------------------------- */}
      <section className="mt-12">
        <div className="mb-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          <div className="min-w-0 flex-1">
            <div className="mb-5 flex flex-wrap items-end gap-3">
              <div>
                <h2 className="font-display text-2xl text-parchment">Your heroes</h2>
                <p className="mt-1 text-sm text-parchment/60">
                  Build a roster of adventurers to bring to the table.
                </p>
              </div>
              <button
                onClick={() => setShowCharacter(true)}
                className="shrink-0 rounded-full bg-gradient-to-r from-ember to-ember-bright px-4 py-2 text-sm font-medium text-ink shadow-md shadow-ember/25 transition hover:scale-[1.02]"
              >
                + New hero
              </button>
            </div>

            {characters.length === 0 ? (
              <EmptyState
                icon="⚔️"
                title="No heroes yet"
                body="Roll up your first adventurer — choose a race, class, and ability scores."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:max-w-2xl">
                {characters.map((c) => (
                  <CharacterCard
                    key={c.id}
                    character={c}
                    onInspect={() => setInspecting(c)}
                    onDelete={() => handleDeleteCharacter(c)}
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="w-full shrink-0 lg:w-[min(100%,20rem)] xl:w-80">
            <p className="mb-3 hidden text-xs font-medium uppercase tracking-wide text-parchment/45 lg:block">
              Stash &amp; trading
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Link
                href="/dashboard/vault"
                className="dd-stash-tile dd-stash-tile-vault group flex min-h-[9.5rem] flex-col items-center justify-center rounded-2xl p-4 text-center sm:min-h-[10.5rem]"
              >
                <span className="text-3xl transition group-hover:scale-110" aria-hidden>
                  🏦
                </span>
                <span className="mt-3 font-display text-base text-parchment">Your Vault</span>
                <span className="mt-1 text-xs text-gold/90">
                  {vaultItemCount > 0
                    ? `${vaultItemCount} items`
                    : "Inventory manager"}
                </span>
              </Link>
              <StashPlaceholder label="Coming Soon" />
              <StashPlaceholder label="Coming Soon" />
              <StashPlaceholder label="Coming Soon" />
            </div>
          </aside>
        </div>
      </section>

      <Modal
        open={showCharacter}
        onClose={() => setShowCharacter(false)}
        title="Create a hero"
        wide
      >
        <CharacterForm onDone={() => setShowCharacter(false)} />
      </Modal>

      <Modal
        open={showCampaign}
        onClose={() => setShowCampaign(false)}
        title="New campaign"
      >
        <CampaignForm
          key={campaignFormKey}
          characters={characters}
          busyCharacterIds={busyCharacterIds}
          friends={friends}
          onDone={() => setShowCampaign(false)}
        />
      </Modal>

      <Modal open={showJoin} onClose={() => setShowJoin(false)} title="Join a campaign">
        <JoinForm
          characters={characters}
          initialCode={joinCode}
          onDone={() => setShowJoin(false)}
        />
      </Modal>

      <CharacterInspect
        character={inspecting}
        currentUserId={currentUserId}
        onClose={() => setInspecting(null)}
      />
    </div>
  );
}

function CampaignCard({
  entry,
  currentUserId,
  onDelete,
}: {
  entry: CampaignEntry;
  currentUserId: string;
  onDelete: () => void;
}) {
  const { campaign, membership } = entry;
  const isCampaignOwner = campaign.owner_id === currentUserId;
  const isHumanGm = membership.role === "dm";

  function copyCode() {
    navigator.clipboard?.writeText(campaign.invite_code);
  }

  return (
    <div className="dd-panel dd-card-hover relative rounded-2xl p-5">
      <Link
        href={`/campaign/${campaign.id}`}
        className="absolute inset-0 rounded-2xl"
        aria-label={`Open ${campaign.name}`}
      />
      <div className="pointer-events-none relative">
        <div className="flex items-center justify-between gap-2 pr-9">
          <span className="rounded-full bg-arcane/15 px-2.5 py-0.5 text-xs uppercase tracking-wide text-arcane-bright">
            {isHumanGm ? "Game Master" : "Player"}
          </span>
          <span className="font-mono text-xs text-parchment/40">
            {campaign.invite_code}
          </span>
        </div>
        <h3 className="mt-3 font-display text-lg text-parchment">
          {campaign.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-parchment/60">
          {campaign.description || campaign.setting || "An adventure awaits."}
        </p>
      </div>
      <div className="absolute right-3 top-3 z-10">
        <KebabMenu
          items={[
            { label: "Copy invite code", onClick: copyCode },
            isCampaignOwner
              ? { label: "Close campaign", onClick: onDelete, danger: true }
              : { label: "Leave campaign", onClick: onDelete, danger: true },
          ]}
        />
      </div>
    </div>
  );
}

function CharacterCard({
  character,
  onInspect,
  onDelete,
}: {
  character: Character;
  onInspect: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="dd-panel dd-card-hover relative rounded-2xl p-5">
      <div className="absolute right-3 top-3 z-10">
        <KebabMenu
          items={[
            { label: "Inspect", onClick: onInspect },
            { label: "Delete hero", onClick: onDelete, danger: true },
          ]}
        />
      </div>
      <button onClick={onInspect} className="block w-full text-left">
        <div className="flex items-start justify-between pr-8">
          <div>
            <h3 className="font-display text-lg text-parchment">
              {character.name}
            </h3>
            <p className="text-sm text-parchment/60">
              Level {character.level} {character.race} {character.klass}
            </p>
          </div>
          <div className="rounded-lg border border-blood/30 bg-blood/10 px-2.5 py-1 text-center">
            <div className="text-xs text-parchment/50">HP</div>
            <div className="text-sm font-semibold text-red-200">
              {character.current_hp}/{character.max_hp}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-6 gap-1.5">
          {(["str", "dex", "con", "int", "wis", "cha"] as const).map((k) => (
            <div
              key={k}
              className="rounded-md border border-gold/10 bg-black/20 py-1.5 text-center"
            >
              <div className="text-[10px] uppercase text-parchment/40">{k}</div>
              <div className="text-sm text-parchment">{character.abilities[k]}</div>
              <div className="text-[10px] text-gold">
                {formatModifier(abilityModifier(character.abilities[k]))}
              </div>
            </div>
          ))}
        </div>
      </button>
    </div>
  );
}

function StashPlaceholder({ label }: { label: string }) {
  return (
    <div
      className="dd-stash-tile flex min-h-[9.5rem] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-center opacity-55 sm:min-h-[10.5rem]"
      aria-disabled
    >
      <span className="text-2xl text-parchment/25" aria-hidden>
        🔒
      </span>
      <span className="mt-3 font-display text-sm text-parchment/45">{label}</span>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div className="dd-panel rounded-2xl border-dashed p-10 text-center">
      <div className="mx-auto mb-3 text-4xl">{icon}</div>
      <h3 className="font-display text-lg text-parchment">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-parchment/60">{body}</p>
    </div>
  );
}
