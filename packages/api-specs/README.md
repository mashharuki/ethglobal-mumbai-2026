# API client generation

`openapi.yaml` is the source of truth for the proposed parent `/v1` HTTP
contract. Its `GET /api/personas/{personaId}/metadata` operation has its own
AIBot server URL: AIBot would serve that private endpoint to the parent, so it
is not a parent BFF or browser route. The contract does not imply that every
operation has a deployed handler.

The planned shared client uses [OpenAPI Generator 7.26.0](https://openapi-generator.tech/docs/installation/)
with the [`typescript-fetch` generator](https://openapi-generator.tech/docs/generators/typescript-fetch/).
Pin the image tag; do not use `latest`. From the repository root, with Docker
running and the image available:

```sh
docker run --rm \
  -v "$PWD:/local" \
  openapitools/openapi-generator-cli:v7.26.0 generate \
  -i /local/packages/api-specs/openapi.yaml \
  -g typescript-fetch \
  -o /local/packages/shared/src/generated \
  --additional-properties=importFileExtension=.js \
  --global-property=apiDocs=false,modelDocs=false,apiTests=false,modelTests=false
```

Without a Docker daemon, install a Java 17 runtime first (the 7.26.0 JAR
requires at least Java 11), then use the pinned official Maven artifact:

```sh
curl -fL \
  https://repo1.maven.org/maven2/org/openapitools/openapi-generator-cli/7.26.0/openapi-generator-cli-7.26.0.jar \
  -o /tmp/openapi-generator-cli-7.26.0.jar
java -version
java -jar /tmp/openapi-generator-cli-7.26.0.jar generate \
  -i packages/api-specs/openapi.yaml \
  -g typescript-fetch \
  -o packages/shared/src/generated \
  --additional-properties=importFileExtension=.js \
  --global-property=apiDocs=false,modelDocs=false,apiTests=false,modelTests=false
```

`typescript-fetch` emits a multi-file client (API classes, models and runtime).
Task T003 additionally calls for `packages/shared/src/generated/client.ts` as its
entry point. That entry point, the generated output and their TypeScript checks
must be committed together only after a successful local generation. Never
hand-edit generated models or API classes. The generation command above is
documented but **has not yet run in this repository**: this worktree has Java 8
only, while the 7.26.0 JAR requires Java 11 or newer, and its Docker daemon is
not running. Accordingly, T003 is still incomplete.

Before committing generated output, verify that the generator accepts the
current OpenAPI 3.1 document, the shared TypeScript check passes, and the client
does not add a Node-only runtime to browser/Worker consumers. If generation
requires a contract change, review that change against the Markdown contracts
before changing `openapi.yaml`.
