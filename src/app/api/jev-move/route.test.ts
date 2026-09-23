import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "./route";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";

function moveRequest(signal?: AbortSignal) {
  return new NextRequest("http://localhost/api/jev-move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      state: { legal: ["up"], food_prefer: [] },
      legal_moves: ["up"],
    }),
    signal,
  });
}

describe("POST /api/jev-move abort plumbing", () => {
  const prevKey = process.env.TYPESAFE_API_KEY;
  const prevAlias = process.env.TYPE_SAFE_API_KEY;

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    if (prevKey === undefined) delete process.env.TYPESAFE_API_KEY;
    else process.env.TYPESAFE_API_KEY = prevKey;
    if (prevAlias === undefined) delete process.env.TYPE_SAFE_API_KEY;
    else process.env.TYPE_SAFE_API_KEY = prevAlias;
  });

  it("forwards an AbortSignal to the TypeSafe upstream fetch", async () => {
    process.env.TYPESAFE_API_KEY = "test-key";
    const controller = new AbortController();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({ answers: { move: { choice: "up", confidence: 1 } } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );

    await POST(moveRequest(controller.signal));

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      ENDPOINT,
      expect.objectContaining({
        method: "POST",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("cancels the upstream TypeSafe fetch when the client aborts mid-flight", async () => {
    process.env.TYPESAFE_API_KEY = "test-key";
    const controller = new AbortController();
    let upstreamSignal: AbortSignal | undefined;
    let resolveStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      resolveStarted = resolve;
    });

    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string | URL | Request, init?: RequestInit) => {
        upstreamSignal = init?.signal ?? undefined;
        resolveStarted();
        return new Promise<Response>((_resolve, reject) => {
          const onAbort = () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          };
          if (init?.signal?.aborted) {
            onAbort();
            return;
          }
          init?.signal?.addEventListener("abort", onAbort, { once: true });
        });
      }),
    );

    const pending = POST(moveRequest(controller.signal));
    await started;
    expect(upstreamSignal?.aborted).toBe(false);
    controller.abort();
    expect(upstreamSignal?.aborted).toBe(true);

    const res = await pending;
    expect(res.status).toBe(499);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("returns 499 immediately when the request is already aborted", async () => {
    process.env.TYPESAFE_API_KEY = "test-key";
    const controller = new AbortController();
    controller.abort();

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await POST(moveRequest(controller.signal));

    expect(res.status).toBe(499);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
