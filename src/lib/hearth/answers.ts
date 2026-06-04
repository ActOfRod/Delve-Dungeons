/** Normalize free-text answers for comparison. */
export function normalizeAnswer(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function answerMatches(guess: string, accepted: string[]): boolean {
  const g = normalizeAnswer(guess);
  if (!g) return false;
  return accepted.some((a) => {
    const n = normalizeAnswer(a);
    return g === n || g.replace(/\s/g, "") === n.replace(/\s/g, "");
  });
}
