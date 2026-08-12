import { Info } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

interface InfoTipProps {
  label: string;
  children: ReactNode;
}

export function InfoTip({ label, children }: InfoTipProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const tooltipId = useId();
  const open = !dismissed && (focused || hovered || pressed);

  useEffect(() => {
    if (!open) return;

    const dismissOutside = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setHovered(false);
      setPressed(false);
      setDismissed(true);
    };
    const dismissWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setHovered(false);
      setPressed(false);
      setDismissed(true);
    };

    document.addEventListener("pointerdown", dismissOutside);
    window.addEventListener("keydown", dismissWithEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      window.removeEventListener("keydown", dismissWithEscape);
    };
  }, [open]);

  const reopen = () => setDismissed(false);

  return (
    <span className="info-tip" ref={rootRef}>
      <button
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        aria-label={`More information about ${label}`}
        className="info-tip__button"
        onBlur={() => setFocused(false)}
        onClick={() => {
          reopen();
          setPressed((value) => !value);
        }}
        onFocus={() => {
          reopen();
          setFocused(true);
        }}
        onPointerEnter={(event) => {
          if (event.pointerType !== "touch") {
            reopen();
            setHovered(true);
          }
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "touch") setHovered(false);
        }}
        type="button"
      >
        <Info aria-hidden="true" size={16} />
      </button>
      {open && (
        <span className="info-tip__content" id={tooltipId} role="tooltip">
          {children}
        </span>
      )}
    </span>
  );
}
