// Local test entry point only. It is not the deployed Worker's main module.
import { SearchCoordinator } from "./room.ts";

export { SearchCoordinator };

type FixtureEnv = {
  SEARCH_COORDINATOR: DurableObjectNamespace<SearchCoordinator>;
};

export default {
  async fetch(request: Request, env: FixtureEnv): Promise<Response> {
    if (request.method !== "POST") return new Response(null, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    const stub = env.SEARCH_COORDINATOR.getByName(body.roomId as string);
    let result: unknown;
    switch (new URL(request.url).pathname) {
      case "/open":
        result = await stub.openLease(
          body as Parameters<typeof stub.openLease>[0],
        );
        break;
      case "/renew":
        result = await stub.renewLease(
          body as Parameters<typeof stub.renewLease>[0],
        );
        break;
      case "/close":
        result = await stub.closeLease(
          body.leaseId as string,
          body.subjectId as string,
        );
        break;
      case "/reserve":
        result = await stub.reserveNextAssignment(
          body.now as number,
          body.blockedPairs as [string, string][],
        );
        break;
      case "/finish":
        result = await stub.finishAssignment(body.assignmentId as string);
        break;
      default:
        return new Response(null, { status: 404 });
    }
    return Response.json(result);
  },
};
