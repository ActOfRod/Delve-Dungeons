# Delve Dungeons

**Online, text-based Dungeons & Dragons with an AI Dungeon Master — for people who love the game but can't carve out eight hours to meet in person.**

Create a hero, start a campaign, invite your friends with a code, and play in real
time. An AI Dungeon Master narrates the world and calls for skill checks; when the
dice land on you, you roll right on screen while the rest of the party watches.

---

## Features

- **Authentication** — email/password sign-up and sign-in via Supabase Auth.
- **Dashboard** — build a roster of D&D 5e characters (race, class, ability
  scores, HP/AC) and see all the campaigns you're part of.
- **Campaigns** — create a table as the Game Master or join a friend's with a
  six-character invite code.
- **AI Dungeon Master** — narrates the adventure and reacts to player actions.
  Uses OpenAI when configured, with a fully playable offline fallback so the game
  works out of the box.
- **Real-time table** _(core feature)_
  - See every player's response to the DM the moment it's posted.
  - A live **"whose turn is it"** banner and party initiative list.
  - **"X is responding…"** typing indicators and online presence dots.
- **Dice & skill checks** _(core feature)_
  - When the DM calls for a check, the targeted player gets an on-screen dice
    roller; **everyone else sees a "check in progress" indicator** and the result
    the instant it's rolled.
  - A shared dice tray (d4–d100) and a running roll log for the whole table.

---

## Tech stack

| Concern        | Choice                                            |
| -------------- | ------------------------------------------------- |
| Framework      | Next.js (App Router) + React + TypeScript         |
| Styling        | Tailwind CSS v4                                    |
| Auth / DB      | Supabase (Postgres + Row Level Security)          |
| Real-time      | Supabase Realtime (Postgres changes, presence, broadcast) |
| AI DM          | OpenAI Chat Completions (optional) + offline fallback |

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** and run each migration in
   [`supabase/migrations/`](supabase/migrations) in order:
   - `0001_init.sql` — core tables, RLS policies, the new-user trigger, realtime.
   - `0002_social.sql` — friend codes, friendships, notifications, and character
     inventory (plus their RLS + realtime).
   - `0003_invites.sql` — invite-only sign-up: an `invite_codes` table and a
     trigger that requires a valid code to create an account. To re-open public
     sign-ups later, drop the trigger:
     `drop trigger if exists on_auth_user_invite on auth.users;`
3. _(Recommended for quick testing)_ Under **Authentication → Providers → Email**,
   you can disable "Confirm email" so new accounts can sign in immediately.

### 3. Configure environment variables

Copy the example file and fill in your project values:

```bash
cp .env.example .env.local
```

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional — enables the OpenAI-powered Dungeon Master.
# Without it, a built-in offline DM narrates locally.
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Find the URL and anon key under **Project Settings → API**.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How a session works

1. **Sign up** and create one or more **heroes** on the dashboard.
2. **Create a campaign** (you become the Game Master) or **join** one with an
   invite code, bringing one of your heroes.
3. In the campaign room, type what your hero does and hit **Act**. The AI
   Dungeon Master responds for the whole table to see in real time.
4. When the DM calls for a skill check (or the GM requests one from the **DM
   Tools** panel), the targeted player rolls a d20 on screen. Everyone watches
   the dice and the success/failure resolve live.
5. Use **End turn →** to move the spotlight to the next hero in initiative order.

---

## Project structure

```
src/
  app/
    page.tsx                 # Marketing landing page
    login/                   # Auth screen (Supabase)
    dashboard/               # Characters + campaigns, server actions
    campaign/[id]/           # The real-time game room
      CampaignRoom.tsx       # Realtime orchestration (presence, turns, checks)
      MessageFeed.tsx        # Narrative log + composer
      PartyPanel.tsx         # Party list + whose-turn banner
      CheckStage.tsx         # On-screen dice roller / check indicator
      DiceTray.tsx, DiceLog.tsx, DMCheckControls.tsx
    api/dm/route.ts          # AI Dungeon Master endpoint (OpenAI + fallback)
  components/                # Logo, Modal, Dice, AppHeader, SetupNotice
  lib/
    dnd.ts                   # Dice, classes, races, ability/skill rules
    dm.ts                    # DM prompt building + offline narrator
    types.ts                 # Shared domain types
    supabase/                # Browser/server clients + session proxy
supabase/migrations/         # SQL schema, RLS, realtime publication
```

---

## Scripts

```bash
npm run dev     # Start the dev server
npm run build   # Production build
npm run start   # Run the production build
npm run lint    # ESLint
```

---

## Roadmap ideas

- Persistent campaign log / "story so far" summaries fed back to the DM.
- Character sheets with proficiencies, spells, and inventory.
- Initiative rolls to set turn order at the start of combat.
- Voice/audio narration of DM responses.
