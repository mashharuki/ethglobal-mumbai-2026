// Local test entry point only. Production routes require a verified match store.
import {
  getSimulationDateRequestStore,
  SimulationDateRequestStore,
} from "./date-request-store.ts";
import type { PendingDateRequest } from "./routes.ts";

export { SimulationDateRequestStore };

type FixtureEnv = CloudflareBindings & {
  SIMULATION_DATE_REQUESTS: DurableObjectNamespace<SimulationDateRequestStore>;
};

export default {
  async fetch(request: Request, env: FixtureEnv): Promise<Response> {
    if (request.method !== "POST") return new Response(null, { status: 404 });
    const input = (await request.json()) as PendingDateRequest;
    const stub = getSimulationDateRequestStore(env, input.gameSessionId);
    const result = await stub.createPendingDateRequest(input);
    return Response.json(result);
  },
};
