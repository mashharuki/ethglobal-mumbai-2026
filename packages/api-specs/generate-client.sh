#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
generator_jar="${OPENAPI_GENERATOR_JAR:-/tmp/openapi-generator-cli-7.26.0.jar}"
generator_sha256="1760050094997b9cc790cc1350be095f15da8c08a996b184d3eadc4ccda5e35e"
java_bin="${JAVA_BIN:-java}"
generated_dir="$(mktemp -d "${TMPDIR:-/tmp}/secret-tinder-client.XXXXXX")"
trap 'rm -rf "$generated_dir"' EXIT

if [[ ! -f "$generator_jar" ]]; then
  printf 'Missing OpenAPI Generator 7.26.0 JAR: %s\n' "$generator_jar" >&2
  exit 1
fi
if [[ "$(shasum -a 256 "$generator_jar" | cut -d ' ' -f1)" != "$generator_sha256" ]]; then
  printf 'OpenAPI Generator JAR SHA-256 mismatch: %s\n' "$generator_jar" >&2
  exit 1
fi

"$java_bin" -jar "$generator_jar" generate \
  -i "$repo_root/packages/api-specs/openapi.yaml" \
  -g typescript-fetch \
  -o "$generated_dir" \
  --additional-properties=importFileExtension=.js \
  --global-property=apiDocs=false,modelDocs=false,apiTests=false,modelTests=false

test -f "$generated_dir/index.ts"
test -f "$generated_dir/runtime.ts"
test -f "$generated_dir/apis/index.ts"
test -f "$generated_dir/models/index.ts"

target_dir="$repo_root/packages/shared/src/generated"
mkdir -p "$target_dir"
find "$target_dir" -type f -name '*.ts' -delete
cp -R "$generated_dir/apis" "$generated_dir/models" "$target_dir/"
cp "$generated_dir/runtime.ts" "$target_dir/runtime.ts"
cp "$generated_dir/index.ts" "$target_dir/client.ts"
