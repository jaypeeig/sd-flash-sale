export const remainingMsUntil = (targetIso: string, offsetMs: number): number =>
  Math.max(0, Date.parse(targetIso) - (Date.now() + offsetMs));
