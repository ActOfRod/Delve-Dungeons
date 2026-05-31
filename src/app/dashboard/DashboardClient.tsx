"use client";

import { useState } from "react";
import Link from "next/link";
import type { Campaign, CampaignMember, Character } from "@/lib/types";
import { Modal } from "@/components/Modal";
import { CharacterForm } from "./CharacterForm";
import { CampaignForm } from "./CampaignForm";
import { JoinForm } from "./JoinForm";
import { abilityModifier, formatModifier } from "@/lib/dnd";

type CampaignEntry = { membership: CampaignMember; campaign: Campaign };

export function DashboardClient({
  characters,
  campaigns,
}: {
  characters: Character[];
  campaigns: CampaignEntry[];
}) {
  const [showCharacter, setShowCharacter] = useState(false);
  const [showCampaign, setShowCampaign] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

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
              onClick={() => setShowJoin(true)}
              className="rounded-full border border-gold/30 px-4 py-2 text-sm text-parchment transition hover:border-gold/60 hover:bg-gold/10"
            >
              Join with code
            </button>
            <button
              onClick={() => setShowCampaign(true)}
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
            {campaigns.map(({ campaign, membership }) => (
              <Link
                key={campaign.id}
                href={`/campaign/${campaign.id}`}
                className="dd-panel dd-card-hover block rounded-2xl p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-arcane/15 px-2.5 py-0.5 text-xs uppercase tracking-wide text-arcane-bright">
                    {membership.role === "dm" ? "Game Master" : "Player"}
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
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Characters --------------------------------------------------------- */}
      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl text-parchment">Your heroes</h2>
            <p className="text-sm text-parchment/60">
              Build a roster of adventurers to bring to the table.
            </p>
          </div>
          <button
            onClick={() => setShowCharacter(true)}
            className="rounded-full bg-gradient-to-r from-ember to-ember-bright px-4 py-2 text-sm font-medium text-ink transition hover:scale-[1.02]"
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {characters.map((c) => (
              <CharacterCard key={c.id} character={c} />
            ))}
          </div>
        )}
      </section>

      <Modal
        open={showCharacter}
        onClose={() => setShowCharacter(false)}
        title="Create a hero"
      >
        <CharacterForm onDone={() => setShowCharacter(false)} />
      </Modal>

      <Modal
        open={showCampaign}
        onClose={() => setShowCampaign(false)}
        title="New campaign"
      >
        <CampaignForm
          characters={characters}
          onDone={() => setShowCampaign(false)}
        />
      </Modal>

      <Modal open={showJoin} onClose={() => setShowJoin(false)} title="Join a campaign">
        <JoinForm characters={characters} onDone={() => setShowJoin(false)} />
      </Modal>
    </div>
  );
}

function CharacterCard({ character }: { character: Character }) {
  return (
    <div className="dd-panel dd-card-hover rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-lg text-parchment">{character.name}</h3>
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
