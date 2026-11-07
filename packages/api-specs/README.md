# API client generation

`openapi.yaml` is the source of truth for the proposed parent `/v1` HTTP
contract. Its `GET /api/personas/{personaId}/metadata` operation has an
operation-level AIBot server URL: AIBot would serve that private endpoint to
the parent, so it is not a parent BFF or browser route. A contract operation
does not imply a deployed handler.

The shared client is generated with [OpenAPI Generator 7.26.0](https://openapi-generator.tech/docs/installation/)
and its [`typescript-fetch` generator](https://openapi-generator.tech/docs/generators/typescript-fetch/).
Install Java 17 or newer (the JAR requires at least Java 11), then download the
fixed official artifact. From the repository root:

```sh
curl -fL \
  https://repo1.maven.org/maven2/org/openapitools/openapi-generator-cli/7.26.0/openapi-generator-cli-7.26.0.jar \
  -o /tmp/openapi-generator-cli-7.26.0.jar
JAVA_BIN=/opt/homebrew/opt/openjdk@17/bin/java \
  bash packages/api-specs/generate-client.sh
pnpm --filter shared check-types
pnpm exec biome ci .
```

`JAVA_BIN` may be omitted when `java` on `PATH` is version 17 or newer.
`OPENAPI_GENERATOR_JAR` may point to the same pinned JAR elsewhere. The script
checks its SHA-256, generates into a temporary directory, and replaces only
TypeScript files in `packages/shared/src/generated/`. Its `client.ts` is a copy
of the generator's `index.ts`; all files in that directory are generated and
must never be hand-edited. The generator emits API classes, models and a Fetch
runtime. Biome excludes this generated directory; `check-types` still checks it.

The generated runtime defaults to `/v1`. OpenAPI Generator 7.26.0 does not
apply the operation-level AIBot server URL to `AIBotMetadataApi`, so a parent
service caller must supply the AIBot origin as that class's `basePath` and a
server-only bearer token. Never instantiate this service client in a browser.

Generator 7.26.0 warns that OpenAPI 3.1 support is beta. After contract edits,
regenerate and inspect the affected models and operations, then run the shared
type check. This generated client does not implement or deploy any endpoint.
