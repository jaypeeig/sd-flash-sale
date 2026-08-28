import { MS_PER_HOUR, MS_PER_MINUTE, MS_PER_SECOND } from "./formatDuration.constants";
import { pad } from "./formatDuration.utils";

// XXX: hand-rolled (no Intl) so it stays deterministic in tests — e.g. Intl's
// output shifts with the locale, this always reads H:MM:SS.
export const formatDuration = (ms: number): string => {
  const clamped = Math.max(0, ms);
  const hours = Math.floor(clamped / MS_PER_HOUR);
  const minutes = Math.floor((clamped % MS_PER_HOUR) / MS_PER_MINUTE);
  const seconds = Math.floor((clamped % MS_PER_MINUTE) / MS_PER_SECOND);
  return `${hours}:${pad(minutes)}:${pad(seconds)}`;
};
