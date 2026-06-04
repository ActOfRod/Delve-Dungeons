/** D&D 5e cumulative XP required to reach each level (index = level − 1). */
export const XP_LEVEL_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000,
  120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
] as const;

export const MAX_CHARACTER_LEVEL = 20;

/** XP for defeating a foe by narrative difficulty (not full CR math). */
export const ENEMY_DIFFICULTY_XP: Record<string, number> = {
  trivial: 10,
  minion: 10,
  cr0: 10,
  easy: 25,
  weak: 25,
  cr1: 25,
  "1/4": 25,
  medium: 50,
  moderate: 50,
  cr2: 50,
  "1/2": 50,
  hard: 100,
  tough: 100,
  cr3: 100,
  deadly: 200,
  elite: 200,
  cr4: 200,
  boss: 450,
  legendary: 450,
  cr5: 450,
};

export const PUZZLE_XP = 25;

export interface XpDirective {
  raw: string;
  amount: number;
  label: string;
}

export interface XpProgress {
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpForNextLevel: number | null;
  progressPercent: number;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  for (let i = XP_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVEL_THRESHOLDS[i]!) {
      level = i + 1;
      break;
    }
  }
  return Math.min(MAX_CHARACTER_LEVEL, level);
}

export function xpProgress(level: number, xp: number): XpProgress {
  const idx = Math.max(0, Math.min(level - 1, XP_LEVEL_THRESHOLDS.length - 1));
  const floor = XP_LEVEL_THRESHOLDS[idx] ?? 0;
  const next = XP_LEVEL_THRESHOLDS[idx + 1] ?? null;
  const xpIntoLevel = xp - floor;
  const xpForNextLevel = next == null ? null : next - floor;
  const progressPercent =
    xpForNextLevel == null || xpForNextLevel <= 0
      ? 100
      : Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100));
  return { level, xp, xpIntoLevel, xpForNextLevel, progressPercent };
}

/** XP for passing a campaign skill check (scales slightly with DC). */
export function xpForSuccessfulCheck(dc: number): number {
  const safeDc = Math.max(5, Math.min(30, Math.round(dc)));
  return Math.min(50, 10 + safeDc * 2);
}

export function resolveXpDirectiveAmount(payload: string): number | null {
  const text = payload.trim().toLowerCase();
  if (!text) return null;

  const bareNumber = text.match(/^(\d+)$/);
  if (bareNumber) {
    const n = parseInt(bareNumber[1]!, 10);
    return n > 0 ? n : null;
  }

  if (text === "puzzle" || text.startsWith("puzzle ")) {
    return PUZZLE_XP;
  }

  const enemyMatch = text.match(/^enemy\s+(.+)$/);
  if (enemyMatch) {
    const key = enemyMatch[1]!.trim().replace(/\s+/g, "");
    return ENEMY_DIFFICULTY_XP[key] ?? ENEMY_DIFFICULTY_XP.medium;
  }

  if (text.startsWith("enemy")) {
    return ENEMY_DIFFICULTY_XP.medium;
  }

  return ENEMY_DIFFICULTY_XP[text] ?? null;
}

export function labelForXpDirective(payload: string, amount: number): string {
  const text = payload.trim().toLowerCase();
  if (text === "puzzle" || text.startsWith("puzzle")) {
    return "solving a puzzle";
  }
  const enemyMatch = text.match(/^enemy\s+(.+)$/);
  if (enemyMatch || text.startsWith("enemy")) {
    const tier = enemyMatch?.[1]?.trim() ?? "foe";
    return `defeating a ${tier} enemy`;
  }
  if (/^\d+$/.test(text)) {
    return "heroic deed";
  }
  return text || "adventure";
}

/** Parse all `[XP: …]` directives from DM narration. */
export function parseXpDirectives(
  text: string,
): { directives: XpDirective[]; cleaned: string } {
  const directives: XpDirective[] = [];
  const pattern = /\[XP:\s*([^\]]+)\]/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const raw = match[1]!.trim();
    const amount = resolveXpDirectiveAmount(raw);
    if (amount != null) {
      directives.push({
        raw,
        amount,
        label: labelForXpDirective(raw, amount),
      });
    }
  }
  const cleaned = text.replace(pattern, "").replace(/\n{3,}/g, "\n\n").trim();
  return { directives, cleaned };
}

export interface XpAwardResult {
  character_id: string;
  character_name: string;
  xp_awarded: number;
  xp_total: number;
  level: number;
  previous_level: number;
  leveled_up: boolean;
  max_hp: number;
  current_hp: number;
  reason: string | null;
}

export function formatXpAwardMessage(result: XpAwardResult): string {
  const who = result.character_name;
  const base = `${who} gained ${result.xp_awarded} XP (${result.xp_total} total)`;
  if (result.leveled_up) {
    return `${base} — level up! Now level ${result.level} (${result.max_hp} max HP).`;
  }
  return `${base}.`;
}
