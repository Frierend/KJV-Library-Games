import { AlertTriangle, CheckCircle2, Info, WifiOff } from "lucide-react";
import type { ReactNode } from "react";

interface StatusNoticeProps {
  tone?: "info" | "success" | "warning" | "offline";
  children: ReactNode;
  actions?: ReactNode;
  live?: "polite" | "assertive" | "off";
}

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  offline: WifiOff,
};

export function StatusNotice({
  tone = "info",
  children,
  actions,
  live = "polite",
}: StatusNoticeProps) {
  const Icon = icons[tone];
  return (
    <div
      aria-live={live}
      className={`status-notice status-notice--${tone}`}
      role={tone === "warning" ? "alert" : "status"}
    >
      <Icon aria-hidden="true" size={20} />
      <div className="status-notice__content">{children}</div>
      {actions && <div className="status-notice__actions">{actions}</div>}
    </div>
  );
}
