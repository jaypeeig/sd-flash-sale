import type { StatusMessageProps } from "./StatusMessage.types";

const StatusMessage = ({ tone = "info", children }: StatusMessageProps) => {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={tone === "error" ? "text-red-600" : "text-slate-600"}
    >
      {children}
    </p>
  );
};

export default StatusMessage;
