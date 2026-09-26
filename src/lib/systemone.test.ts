import { afterEach, describe, expect, it } from "vitest";

import {
  buildMoveQuestions,
  isProviderId,
  PROVIDERS,
  resolveProvider,
  shapeMoveResult,
} from "./systemone";

describe("systemone providers", () => {
  const prev = {
    TYPESAFE_API_KEY: process.env.TYPESAFE_API_KEY,
    TYPE_SAFE_API_KEY: process.env.TYPE_SAFE_API_KEY,
    TYPESAFE_BASE_URL: process.env.TYPESAFE_BASE_URL,
    DREX_API_KEY: process.env.DREX_API_KEY,
    DREX_BASE_URL: process.env.DREX_BASE_URL,
  };

  afterEach(() => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("recognizes provider ids", () => {
    expect(isProviderId("jev")).toBe(true);
    expect(isProviderId("drex")).toBe(true);
    expect(isProviderId("other")).toBe(false);
  });

  it("defaults Jev to TypeSafe host + jev-latest", () => {
    delete process.env.TYPESAFE_BASE_URL;
    const r = resolveProvider("jev");
    expect(r.endpoint).toBe("https://api.typesafe.ai/v1/systemone");
    expect(r.config.model).toBe("jev-latest");
  });

  it("defaults Drex to api.drex.ai + drex-latest", () => {
    delete process.env.DREX_BASE_URL;
    const r = resolveProvider("drex");
    expect(r.endpoint).toBe("https://api.drex.ai/v1/systemone");
    expect(r.config.model).toBe("drex-latest");
    expect(PROVIDERS.drex.apiKeyEnvs).toContain("DREX_API_KEY");
  });

  it("builds choice questions and shapes responses", () => {
    const questions = buildMoveQuestions(
      { food_prefer: ["up"], food_dist: 3 },
      ["up", "left"],
      false,
    );
    expect(questions.move).toMatchObject({ type: "choice" });
    const shaped = shapeMoveResult(
      {
        model: "drex-1.0.0",
        answers: {
          move: {
            choice: "up",
            confidence: 0.8,
            probabilities: { up: 0.7, left: 0.3 },
          },
        },
        usage: { input_tokens: 1, output_tokens: 1 },
        request_id: "r1",
        evaluation_time_ms: 5,
      },
      ["up", "left"],
      false,
      { model: "drex-latest", state: {}, questions },
      12,
      "drex",
    );
    expect(shaped.provider).toBe("drex");
    expect(shaped.response.choice).toBe("up");
    expect(shaped.response.request_id).toBe("r1");
    expect(shaped.latencyMs).toBe(12);
  });
});
