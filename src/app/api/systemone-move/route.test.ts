import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST as jevPost } from "../jev-move/route";
import { POST as systemonePost } from "./route";
import { resolveProvider } from "@/lib/systemone";

const JEV_ENDPOINT = resolveProvider("jev").endpoint;
const DREX_BASE = "https://gateway.example.com/drex";
const DREX_ENDPOINT = `${DREX_BASE}/v1/systemone`;

function moveRequest(
  body: Record<string, unknown>,
  signal?: AbortSignal,
  path = "/api/systemone-move",
) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      state: { legal: ["up"], food_prefer: [] },
      legal_moves: ["up"],
      ...body,
    }),
    signal,
  });
}

describe("POST /api/systemone-move", () => {
  const prevKeys = {
    TYPESAFE_API_KEY: process.env.TYPESAFE_API_KEY,
    TYPE_SAFE_API_KEY: process.env.TYPE_SAFE_API_KEY,
    DREX_API_KEY: process.env.DREX_API_KEY,
    DREX_BASE_URL: process.env.DREX_BASE_URL,
    TYPESAFE_BASE_URL: process.env.TYPESAFE_BASE_URL,
  };

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    for (const [k, v] of Object.entries(prevKeys)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("forwards AbortSignal to the Jev upstream fetch", async () => {
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

    await systemonePost(moveRequest({ provider: "jev" }, controller.signal));

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      JEV_ENDPOINT,
      expect.objectContaining({
        method: "POST",
        signal: expect.any(AbortSignal),
      }),
    );
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("jev-latest");
  });

  it("calls Drex with drex-latest, DREX_API_KEY, and DREX_BASE_URL", async () => {
    process.env.DREX_API_KEY = "drex-test-key";
    process.env.DREX_BASE_URL = DREX_BASE;

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            model: "drex-1.0.0",
            answers: {
              move: {
                choice: "up",
                confidence: 0.9,
                probabilities: { up: 1 },
              },
            },
            usage: { input_tokens: 10, output_tokens: 2 },
            evaluation_time_ms: 12,
            request_id: "req_test",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );

    const res = await systemonePost(moveRequest({ provider: "drex" }));
    expect(res.status).toBe(200);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      DREX_ENDPOINT,
      expect.objectContaining({ method: "POST" }),
    );
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({
      Authorization: "Bearer drex-test-key",
    });
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("drex-latest");
    const json = await res.json();
    expect(json.provider).toBe("drex");
    expect(json.response.choice).toBe("up");
    expect(json.response.request_id).toBe("req_test");
  });

  it("strips accidental /v1/systemone from DREX_BASE_URL", async () => {
    process.env.DREX_API_KEY = "drex-test-key";
    process.env.DREX_BASE_URL = `${DREX_BASE}/v1/systemone`;

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({ answers: { move: { choice: "up" } } }),
          { status: 200 },
        );
      }),
    );

    await systemonePost(moveRequest({ provider: "drex" }));
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      DREX_ENDPOINT,
      expect.any(Object),
    );
  });

  it("returns 503 when DREX_API_KEY is missing", async () => {
    delete process.env.DREX_API_KEY;
    process.env.DREX_BASE_URL = DREX_BASE;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await systemonePost(moveRequest({ provider: "drex" }));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toMatch(/DREX_API_KEY/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 503 JSON when DREX_BASE_URL is missing", async () => {
    process.env.DREX_API_KEY = "drex-test-key";
    delete process.env.DREX_BASE_URL;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await systemonePost(moveRequest({ provider: "drex" }));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toMatch(/DREX_BASE_URL/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns 502 JSON (not HTML 500) when upstream DNS fails", async () => {
    process.env.DREX_API_KEY = "drex-test-key";
    process.env.DREX_BASE_URL = DREX_BASE;

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw Object.assign(new TypeError("fetch failed"), {
          cause: { code: "ENOTFOUND", hostname: "gateway.example.com" },
        });
      }),
    );

    const res = await systemonePost(moveRequest({ provider: "drex" }));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toMatch(/DNS lookup failed/);
    expect(json.provider).toBe("drex");
  });

  it("cancels the upstream fetch when the client aborts mid-flight", async () => {
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

    const pending = systemonePost(
      moveRequest({ provider: "jev" }, controller.signal),
    );
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

    const res = await systemonePost(
      moveRequest({ provider: "jev" }, controller.signal),
    );

    expect(res.status).toBe(499);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps /api/jev-move as a Jev alias", async () => {
    process.env.TYPESAFE_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({ answers: { move: { choice: "up" } } }),
          { status: 200 },
        );
      }),
    );

    const res = await jevPost(moveRequest({}, undefined, "/api/jev-move"));
    expect(res.status).toBe(200);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      JEV_ENDPOINT,
      expect.any(Object),
    );
  });
});
