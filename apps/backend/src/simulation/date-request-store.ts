import { DurableObject } from "cloudflare:workers";
import {
  authorizedSimulationMatchSchema,
  simulationDateRequestInputSchema,
} from "shared";
import type { DateRequestWrite, PendingDateRequest } from "./routes.ts";

type DateRequestRow = {
  player_subject: string;
  match_id: string;
  game_session_id: string;
  request_id: string;
};

export class SimulationDateRequestStore extends DurableObject<CloudflareBindings> {
  constructor(ctx: DurableObjectState, env: CloudflareBindings) {
    super(ctx, env);
    this.ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS pending_request (id INTEGER PRIMARY KEY CHECK (id = 1), player_subject TEXT NOT NULL, match_id TEXT NOT NULL, game_session_id TEXT NOT NULL, request_id TEXT NOT NULL)",
    );
  }

  createPendingDateRequest(input: PendingDateRequest): DateRequestWrite {
    const parsed = simulationDateRequestInputSchema.safeParse({
      matchId: input.matchId,
      gameSessionId: input.gameSessionId,
    });
    const subject =
      authorizedSimulationMatchSchema.shape.playerSubject.safeParse(
        input.playerSubject,
      );
    if (!parsed.success || !subject.success)
      throw new Error("Invalid internal date request");
    return this.ctx.storage.transactionSync(() => {
      const existing = this.ctx.storage.sql
        .exec<DateRequestRow>("SELECT * FROM pending_request WHERE id = 1")
        .toArray()[0];
      if (existing) {
        if (
          existing.player_subject !== input.playerSubject ||
          existing.match_id !== input.matchId ||
          existing.game_session_id !== input.gameSessionId
        )
          return { ok: false, error: "CONFLICT" };
        return {
          ok: true,
          data: { requestId: existing.request_id, status: "pending" },
        };
      }
      const requestId = crypto.randomUUID();
      this.ctx.storage.sql.exec(
        "INSERT INTO pending_request VALUES (1, ?, ?, ?, ?)",
        input.playerSubject,
        input.matchId,
        input.gameSessionId,
        requestId,
      );
      return { ok: true, data: { requestId, status: "pending" } };
    });
  }
}

export function getSimulationDateRequestStore(
  env: CloudflareBindings,
  gameSessionId: string,
): DurableObjectStub<SimulationDateRequestStore> {
  const bindings = env as CloudflareBindings & {
    SIMULATION_DATE_REQUESTS: DurableObjectNamespace<SimulationDateRequestStore>;
  };
  return bindings.SIMULATION_DATE_REQUESTS.getByName(gameSessionId);
}
