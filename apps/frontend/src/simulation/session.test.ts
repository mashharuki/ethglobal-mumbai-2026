import assert from "node:assert/strict";
import { it } from "node:test";

import { getTrustedAibotOrigin, isTrustedHandoffReady } from "./session.ts";

it("should accept only an HTTPS AIBot origin or local development", () => {
  assert.equal(
    getTrustedAibotOrigin("https://love-match-masala.vercel.app"),
    "https://love-match-masala.vercel.app",
  );
  assert.equal(
    getTrustedAibotOrigin("http://127.0.0.1:3010"),
    "http://127.0.0.1:3010",
  );
  assert.equal(getTrustedAibotOrigin("http://example.com"), null);
  assert.equal(getTrustedAibotOrigin("https://example.com/handoff"), null);
  assert.equal(getTrustedAibotOrigin("https://user:pass@example.com"), null);
});

it("should accept readiness only from the opened AIBot window", () => {
  const popup = {} as Window;
  const ready = { type: "secret-tinder:ready", version: 1 };
  const origin = "https://love-match-masala.vercel.app";
  assert.equal(
    isTrustedHandoffReady(
      { origin, source: popup, data: ready },
      popup,
      origin,
    ),
    true,
  );
  assert.equal(
    isTrustedHandoffReady(
      { origin: "https://attacker.example", source: popup, data: ready },
      popup,
      origin,
    ),
    false,
  );
  assert.equal(
    isTrustedHandoffReady({ origin, source: null, data: ready }, popup, origin),
    false,
  );
  assert.equal(
    isTrustedHandoffReady(
      { origin, source: popup, data: { ...ready, version: 2 } },
      popup,
      origin,
    ),
    false,
  );
});
