import { NextRequest, NextResponse } from "next/server";

import {
  buildMoveQuestions,
  isProviderId,
  resolveProvider,
  shapeMoveResult,
  type ProviderId,
} from "@/lib/systemone";

export async function handleSystemOneMove(
  req: NextRequest,
  defaultProvider: ProviderId = "jev",
) {
  const body = await req.json();
  const providerId: ProviderId = isProviderId(body?.provider)
    ? body.provider
    : defaultProvider;

  const { config, apiKey, endpoint } = resolveProvider(providerId);
  if (!apiKey) {
    return NextResponse.json({ error: config.missingKeyError }, { status: 503 });
  }

  const state = body?.state;
  const legal: string[] = body?.legal_moves || state?.legal || [];
  const batch = Boolean(body?.batch);
  if (!state || !Array.isArray(legal) || legal.length === 0) {
    return NextResponse.json(
      { error: "state and legal_moves required" },
      { status: 400 },
    );
  }

  const questions = buildMoveQuestions(state, legal, batch);
  const payload = { model: config.model, state, questions };

  // Client abort (pause/reset/idle stop) must cancel the upstream call
  // so lifecycle restarts cannot stack orphaned billable requests.
  if (req.signal.aborted) {
    return new NextResponse(null, { status: 499 });
  }

  const t0 = performance.now();
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: req.signal,
    });
  } catch (err) {
    if (
      req.signal.aborted ||
      (err instanceof Error && err.name === "AbortError")
    ) {
      return new NextResponse(null, { status: 499 });
    }
    throw err;
  }
  const latencyMs = Math.round(performance.now() - t0);
  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    return NextResponse.json(
      {
        error: `${config.label} HTTP ${res.status}`,
        body: data,
        request: payload,
        provider: providerId,
        latencyMs,
      },
      { status: res.status },
    );
  }

  return NextResponse.json(
    shapeMoveResult(data, legal, batch, payload, latencyMs, providerId),
  );
}
