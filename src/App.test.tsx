import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
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
});
