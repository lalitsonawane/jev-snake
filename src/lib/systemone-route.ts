import { NextRequest, NextResponse } from "next/server";

import {
  buildMoveQuestions,
  describeUpstreamFetchError,
  isProviderId,
  resolveProvider,
  shapeMoveResult,
  type ProviderId,
} from "@/lib/systemone";

const SYSTEMONE_TIMEOUT_MS = 20_000;

export async function handleSystemOneMove(
  req: NextRequest,
  defaultProvider: ProviderId = "jev",
) {
  const body = await req.json();
  const providerId: ProviderId = isProviderId(body?.provider)
    ? body.provider
    : defaultProvider;

  const { config, apiKey, endpoint, baseUrlError } = resolveProvider(providerId);
  if (!apiKey) {
    return NextResponse.json({ error: config.missingKeyError }, { status: 503 });
  }
  if (baseUrlError || !endpoint) {
    return NextResponse.json(
      { error: baseUrlError || `${config.label} base URL not configured` },
      { status: 503 },
    );
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
  const controller = new AbortController();
  let timedOut = false;
  const abortUpstream = () => controller.abort(req.signal.reason);
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, SYSTEMONE_TIMEOUT_MS);
  req.signal.addEventListener("abort", abortUpstream, { once: true });

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    if (req.signal.aborted) {
      return new NextResponse(null, { status: 499 });
    }
    if (timedOut) {
      return NextResponse.json(
        {
          error: `${config.label} request timed out`,
          provider: providerId,
        },
        { status: 504 },
      );
    }
    // Upstream DNS/connect failures must be JSON — a bare throw becomes HTML 500
    // and Safari surfaces that as "The string did not match the expected pattern"
    // when the client calls res.json().
    return NextResponse.json(
      {
        error: describeUpstreamFetchError(err, endpoint, config.label),
        provider: providerId,
        endpointHost: (() => {
          try {
            return new URL(endpoint).host;
          } catch {
            return null;
          }
        })(),
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeoutId);
    req.signal.removeEventListener("abort", abortUpstream);
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
    // Clamp odd upstream statuses so NextResponse always gets a valid code.
    const status =
      res.status >= 400 && res.status <= 599 ? res.status : 502;
    return NextResponse.json(
      {
        error: `${config.label} HTTP ${res.status}`,
        body: data,
        request: payload,
        provider: providerId,
        latencyMs,
      },
      { status },
    );
  }

  return NextResponse.json(
    shapeMoveResult(data, legal, batch, payload, latencyMs, providerId),
  );
}
