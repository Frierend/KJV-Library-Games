import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type InteractionState =
  | "idle"
  | "selected"
  | "checking"
  | "correct"
  | "incorrect"
  | "revealed"
  | "loading"
  | "restored"
  | "warning"
  | "expired";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "reveal" | "danger";
  state?: InteractionState;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      state = "idle",
      leadingIcon,
      trailingIcon,
      className = "",
      children,
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        {...props}
        ref={ref}
        className={`button button--${variant} ${className}`.trim()}
        data-state={state}
        type={type}
      >
        {leadingIcon && <span className="button__icon">{leadingIcon}</span>}
        <span>{children}</span>
        {trailingIcon && <span className="button__icon">{trailingIcon}</span>}
      </button>
    );
  },
);
