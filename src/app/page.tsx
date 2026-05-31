import Link from "next/link";
import { Logo } from "@/components/Logo";

const FEATURES = [
  {
    title: "An AI Dungeon Master",
    body: "A tireless storyteller narrates your world, voices every NPC, and adapts the adventure to whatever your party tries next.",
    icon: "✦",
  },
  {
    title: "Real-time at the table",
    body: "Watch the story unfold live. See exactly when a fellow adventurer responds and whose turn it is to act.",
    icon: "⌁",
  },
  {
    title: "Dice that everyone feels",
    body: "When a skill check lands on you, roll right on screen. The rest of the party watches the dice tumble in real time.",
    icon: "⚄",
  },
];

export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <Link
          href="/login"
          className="rounded-full border border-gold/30 px-5 py-2 text-sm font-medium text-parchment transition hover:border-gold/60 hover:bg-gold/10"
        >
          Sign in
        </Link>
      </header>

      <section className="mx-auto max-w-4xl px-6 pb-12 pt-16 text-center">
        <p className="mb-4 inline-block rounded-full border border-arcane/40 bg-arcane/10 px-4 py-1 text-xs uppercase tracking-[0.2em] text-arcane-bright">
          Online D&amp;D · AI Dungeon Master
        </p>
        <h1 className="font-display text-4xl font-bold leading-tight text-parchment sm:text-6xl">
          Adventure awaits,
          <span className="block bg-gradient-to-r from-gold via-ember-bright to-arcane-bright bg-clip-text text-transparent">
            no calendar required.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-parchment/75">
          Delve Dungeons is text-based Dungeons &amp; Dragons with an AI Dungeon
          Master — built for people who love the game but can&apos;t carve out
          eight hours to meet in person. Drop in, play a few rounds, and pick the
          story back up whenever your party is ready.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/login"
            className="rounded-full bg-gradient-to-r from-ember to-ember-bright px-8 py-3 font-medium text-ink shadow-lg shadow-ember/30 transition hover:scale-[1.02]"
          >
            Begin your delve
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-gold/30 px-8 py-3 font-medium text-parchment transition hover:border-gold/60 hover:bg-gold/10"
          >
            I have an invite code
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-5 px-6 pb-24 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="dd-panel dd-card-hover rounded-2xl p-6">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-xl text-gold">
              {f.icon}
            </div>
            <h3 className="font-display text-lg text-parchment">{f.title}</h3>
            <p className="mt-2 text-sm text-parchment/70">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-sm text-parchment/40">
        Roll initiative. © {new Date().getFullYear()} Delve Dungeons.
      </footer>
    </main>
  );
}
