import { NextRequest } from "next/server";

import { handleSystemOneMove } from "@/lib/systemone-route";

/**
 * Unified System One move endpoint.
 * Body: `{ provider: "jev" | "drex", state, legal_moves, batch? }`
 */
export async function POST(req: NextRequest) {
  return handleSystemOneMove(req, "jev");
}
