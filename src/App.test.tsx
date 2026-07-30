import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("game library", () => {
  it("returns to the library after a full app remount", async () => {
    const firstRender = render(<App />);
    fireEvent.click(
      screen.getAllByRole("button", { name: /open game/i })[0],
    );
    expect(
      await screen.findByRole("button", { name: /start quiz/i }),
    ).toBeInTheDocument();

    firstRender.unmount();
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "KJV Bible Games" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /open game/i })).toHaveLength(2);
  });
});
