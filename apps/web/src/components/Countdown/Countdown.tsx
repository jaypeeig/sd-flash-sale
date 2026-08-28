import { useCountdown } from "../../hooks/useCountdown";
import { formatDuration } from "../../lib/formatDuration";
import type { CountdownProps } from "./Countdown.types";

const Countdown = ({ label, targetIso, serverTimeIso }: CountdownProps) => {
  const remainingMs = useCountdown(targetIso, serverTimeIso);

  return (
    <p className="text-orange-600">
      {label}{" "}
      <time dateTime={targetIso} className="font-medium">
        {formatDuration(remainingMs)}
      </time>
    </p>
  );
};

export default Countdown;
