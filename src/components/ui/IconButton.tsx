import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { InteractionState } from "./Button";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  state?: InteractionState;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      label,
      icon,
      state = "idle",
      className = "",
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        {...props}
        aria-label={label}
        className={`icon-button ${className}`.trim()}
        data-state={state}
        ref={ref}
        title={props.title ?? label}
        type={type}
      >
        {icon}
      </button>
    );
  },
);
