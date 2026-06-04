/** UTC calendar day for daily Hearth content (matches General shop). */
export function hearthDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function previousHearthDayKey(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return hearthDayKey(d);
}

export function dayIndexForPool(dayKey: string, poolLength: number): number {
  let hash = 0;
  for (let i = 0; i < dayKey.length; i++) {
    hash = (Math.imul(hash, 31) + dayKey.charCodeAt(i)) >>> 0;
  }
  return poolLength > 0 ? hash % poolLength : 0;
}
