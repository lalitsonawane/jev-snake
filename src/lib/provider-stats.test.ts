import { describe, expect, it } from "vitest";

import {
  agreementRate,
  avgMs,
  emptySessionStats,
  parseUsageTokens,
  recordApiTick,
  recordCompareAgreement,
  recordHeldMove,
} from "./provider-stats";

describe("provider-stats", () => {
  it("accumulates successful API ticks", () => {
    let s = emptySessionStats().jev;
    s = recordApiTick(s, {
      ok: true,
      latencyMs: 100,
      choice: "up",
      confidence: 0.8,
      evaluationTimeMs: 40,
      usage: { input_tokens: 10, output_tokens: 2 },
    });
    s = recordApiTick(s, {
      ok: true,
      latencyMs: 200,
      choice: "left",
      confidence: 0.6,
      evaluationTimeMs: 60,
      usage: { input_tokens: 5, output_tokens: 1 },
    });
    expect(s.apiCalls).toBe(2);
    expect(s.errors).toBe(0);
    expect(avgMs(s.latencySum, s.latencyCount)).toBe(150);
    expect(s.inputTokens).toBe(15);
    expect(s.outputTokens).toBe(3);
    expect(s.lastChoice).toBe("left");
    expect(s.lastConfidence).toBe(0.6);
  });

  it("counts errors and held moves", () => {
    let s = emptySessionStats().drex;
    s = recordApiTick(s, { ok: false, latencyMs: 12 });
    s = recordHeldMove(s);
    s = recordHeldMove(s);
    expect(s.errors).toBe(1);
    expect(s.heldMoves).toBe(2);
    expect(s.apiCalls).toBe(0);
  });

  it("tracks compare agreement", () => {
    let stats = emptySessionStats();
    stats = recordCompareAgreement(stats, "up", "up");
    stats = recordCompareAgreement(stats, "left", "right");
    expect(stats.jev.comparedChoices).toBe(2);
    expect(stats.jev.agreements).toBe(1);
    expect(agreementRate(stats.jev)).toBe(0.5);
  });

  it("parses usage token aliases", () => {
    expect(parseUsageTokens({ prompt_tokens: 3, completion_tokens: 4 })).toEqual({
      input: 3,
      output: 4,
    });
    expect(parseUsageTokens(null)).toEqual({ input: 0, output: 0 });
  });
});
