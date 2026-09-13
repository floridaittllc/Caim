import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

describe("CAIm keyboard", () => {
  it("types from the on-screen keys into the composer", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId("key-char-c"));
    await user.click(screen.getByTestId("key-char-a"));
    await user.click(screen.getByTestId("key-char-i"));
    await user.click(screen.getByTestId("key-char-m"));

    expect(screen.getByTestId("composer")).toHaveValue("caim");
  });

  it("shifts the next letter, then returns to lowercase", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId("key-shift"));
    await user.click(screen.getByTestId("key-char-c"));
    await user.click(screen.getByTestId("key-char-a"));

    expect(screen.getByTestId("composer")).toHaveValue("Ca");
  });

  it("inserts comma and period from the letter layer", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId("key-char-c"));
    await user.click(screen.getByTestId("key-char-,"));
    await user.click(screen.getByTestId("key-char-a"));
    await user.click(screen.getByTestId("key-char-."));

    expect(screen.getByTestId("composer")).toHaveValue("c,a.");
    expect(screen.getByTestId("key-char-,")).toHaveAccessibleName("comma");
    expect(screen.getByTestId("key-char-.")).toHaveAccessibleName("period");
  });

  it("turns a double space into a period", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId("key-char-h"));
    await user.click(screen.getByTestId("key-char-i"));
    await user.click(screen.getByTestId("key-space"));
    await user.click(screen.getByTestId("key-space"));

    expect(screen.getByTestId("composer")).toHaveValue("hi. ");
  });

  it("moves the composer caret with arrows and inserts in the middle", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId("key-char-c"));
    await user.click(screen.getByTestId("key-char-a"));
    await user.click(screen.getByTestId("key-char-i"));
    await user.click(screen.getByTestId("key-left"));
    await user.click(screen.getByTestId("key-char-m"));

    expect(screen.getByTestId("composer")).toHaveValue("cami");
  });

  it("undoes the last insert from the toolbar", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId("key-char-c"));
    await user.click(screen.getByTestId("key-char-a"));
    await user.click(screen.getByTestId("undo"));

    expect(screen.getByTestId("composer")).toHaveValue("c");
  });

  it("switches to the PIN pad and only accepts digits", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId("mode-pin"));
    await user.click(screen.getByTestId("key-char-1"));
    await user.click(screen.getByTestId("key-char-2"));
    await user.click(screen.getByTestId("key-char-3"));
    await user.click(screen.getByTestId("key-enter"));

    expect(screen.getByTestId("composer")).toHaveValue("•••");
    expect(screen.getByTestId("pin-submitted")).toHaveTextContent("3 digits");
  });

  it("shows empty-state copy and does not capture an empty PIN", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId("mode-pin"));
    expect(screen.getByTestId("status")).toHaveTextContent("Enter a PIN, then press enter");
    expect(screen.getByTestId("key-enter")).toBeDisabled();
    expect(screen.queryByTestId("pin-submitted")).not.toBeInTheDocument();
    expect(screen.getByTestId("composer")).toHaveValue("");
  });

  it("caps the PIN at eight digits", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId("mode-pin"));
    for (const digit of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]) {
      await user.click(screen.getByTestId(`key-char-${digit}`));
    }

    expect(screen.getByTestId("composer")).toHaveValue("••••••••");
    expect(screen.getByTestId("status")).toHaveTextContent("8 / 8 digits");
  });

  it("keeps typed text when switching to PIN and back", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId("key-char-c"));
    await user.click(screen.getByTestId("key-char-a"));
    await user.click(screen.getByTestId("mode-pin"));
    await user.click(screen.getByTestId("key-char-1"));
    await user.click(screen.getByTestId("mode-qwerty"));

    expect(screen.getByTestId("composer")).toHaveValue("ca");
  });

  it("exposes the keyboard as a labelled group with pressed shift state", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByTestId("keyboard")).toHaveAttribute("role", "group");
    expect(screen.getByTestId("keyboard")).toHaveAccessibleName("On-screen keyboard");
    expect(screen.getByTestId("key-shift")).toHaveAttribute("aria-pressed", "false");

    await user.click(screen.getByTestId("key-shift"));
    expect(screen.getByTestId("key-shift")).toHaveAttribute("aria-pressed", "true");
  });

  it("shows a status message when clipboard copy fails", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId("key-char-c"));
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    await user.click(screen.getByTestId("copy"));
    expect(screen.getByTestId("status")).toHaveTextContent("clipboard unavailable");
  });
});
