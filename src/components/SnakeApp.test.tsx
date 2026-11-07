// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SnakeApp from "./SnakeApp";

type FetchResult = {
  ok: boolean;
  json: () => Promise<unknown>;
};

function jevResult(choice: string): FetchResult {
  return {
    ok: true,
    json: async () => ({
      request: {},
      response: {
        choice,
        probabilities: { [choice]: 1 },
      },
      latencyMs: 0,
    }),
  };
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function currentStep() {
  return screen.getByText("Step").parentElement?.textContent;
}

describe("SnakeApp autoplay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("reuses a straight Jev choice until food and then requests a new decision", async () => {
    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
      void args;
      const call = fetchMock.mock.calls.length;
      const choice = call <= 5 ? "right" : call === 6 ? "down" : "left";
      return jevResult(choice);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<SnakeApp />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    await advance(0);
    await advance(820);

    expect(currentStep()).toBe("Step10");
    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(screen.getByText("held · no API this tick")).toBeTruthy();
    expect(screen.getByText("held · 0 ms")).toBeTruthy();

    await advance(90);
    expect(fetchMock).toHaveBeenCalledTimes(7);
  });

  it("aborts and ignores an in-flight response when paused", async () => {
    let resolveFetch: ((result: FetchResult) => void) | undefined;
    const fetchMock = vi.fn(
      (...args: Parameters<typeof fetch>) => {
        void args;
        return new Promise<FetchResult>((resolve) => {
          resolveFetch = resolve;
        });
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<SnakeApp />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    await act(async () => {
      await Promise.resolve();
    });

    const signal = fetchMock.mock.calls[0]?.[1]?.signal as AbortSignal;
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(signal.aborted).toBe(true);

    await act(async () => {
      resolveFetch?.(jevResult("right"));
      await Promise.resolve();
    });
    expect(currentStep()).toBe("Step0");
  });
});
