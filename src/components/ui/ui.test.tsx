import { fireEvent, render, screen } from "@testing-library/react";
import { Check } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { playTone } from "../../utils";
import { Button } from "./Button";
import { ConfirmDialog } from "./ConfirmDialog";
import { IconButton } from "./IconButton";
import { LoadingState } from "./LoadingState";

describe("KJVenture UI foundations", () => {
  it("exposes interaction state and accessible icon names", () => {
    render(
      <>
        <Button state="correct">Checked answer</Button>
        <IconButton icon={<Check />} label="Confirm selection" />
      </>,
    );
    expect(screen.getByRole("button", { name: "Checked answer" })).toHaveAttribute(
      "data-state",
      "correct",
    );
    expect(screen.getByRole("button", { name: "Confirm selection" })).toBeVisible();
  });

  it("traps dialog focus, closes with Escape, and restores the opener", () => {
    const cancel = vi.fn();
    const confirm = vi.fn();
    const view = render(
      <>
        <button>Open confirmation</button>
        <ConfirmDialog
          confirmLabel="Leave"
          description="Your work is saved."
          onCancel={cancel}
          onConfirm={confirm}
          open={false}
          title="Leave session?"
        />
      </>,
    );
    const opener = screen.getByRole("button", { name: "Open confirmation" });
    opener.focus();
    view.rerender(
      <>
        <button>Open confirmation</button>
        <ConfirmDialog
          confirmLabel="Leave"
          description="Your work is saved."
          onCancel={cancel}
          onConfirm={confirm}
          open
          title="Leave session?"
        />
      </>,
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    const close = screen.getByRole("button", { name: "Close dialog" });
    const leave = screen.getByRole("button", { name: "Leave" });
    close.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(leave).toHaveFocus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(cancel).toHaveBeenCalledOnce();

    view.rerender(
      <>
        <button>Open confirmation</button>
        <ConfirmDialog
          confirmLabel="Leave"
          description="Your work is saved."
          onCancel={cancel}
          onConfirm={confirm}
          open={false}
          title="Leave session?"
        />
      </>,
    );
    expect(opener).toHaveFocus();
  });

  it("announces loading and treats disabled audio as a no-op", () => {
    expect(() => playTone(false, 440, 0.1)).not.toThrow();
    render(<LoadingState label="Preparing a game" />);
    expect(screen.getByRole("status")).toHaveTextContent("Preparing a game");
  });
});
