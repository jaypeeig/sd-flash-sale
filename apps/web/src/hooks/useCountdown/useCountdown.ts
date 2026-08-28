import { useEffect, useState } from "react";
import { TICK_MS } from "./useCountdown.constants";
import { remainingMsUntil } from "./useCountdown.utils";

// XXX: the client-vs-server clock offset is captured once at mount, then
// ticked locally — this is why every Sale carries serverTime. A later
// serverTime from a poll is deliberately ignored so the number never jumps.
export const useCountdown = (targetIso: string, serverTimeIso: string): number => {
  const [offsetMs] = useState(() => Date.parse(serverTimeIso) - Date.now());
  const [remainingMs, setRemainingMs] = useState(() => remainingMsUntil(targetIso, offsetMs));

  useEffect(() => {
    const tick = () => setRemainingMs(remainingMsUntil(targetIso, offsetMs));
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [targetIso, offsetMs]);

  return remainingMs;
};
