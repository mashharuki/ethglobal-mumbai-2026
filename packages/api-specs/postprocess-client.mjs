import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const targetDirectory = process.argv[2];
if (!targetDirectory) throw new Error("Generated client directory is required");

function replaceExact(source, before, after, expected = 1) {
  const count = source.split(before).length - 1;
  if (count !== expected) {
    throw new Error(
      `Generator output changed: expected ${expected} occurrences, found ${count}`,
    );
  }
  return source.replaceAll(before, after);
}

function normalize(source) {
  return source.replace(/[ \t]+$/gm, "").replace(/\n+$/, "\n");
}

function adjustRuntime(source) {
  let result = replaceExact(
    source,
    "constructor(private configuration: ConfigurationParameters = {}) {}",
    "private configuration: ConfigurationParameters;\n    constructor(configuration: ConfigurationParameters = {}) { this.configuration = configuration; }",
  );
  result = replaceExact(
    result,
    "private middleware: Middleware[];\n\n    constructor(protected configuration = DefaultConfig) {\n        this.middleware = configuration.middleware;",
    "private middleware: Middleware[];\n    protected configuration: Configuration;\n\n    constructor(configuration = DefaultConfig) {\n        this.configuration = configuration;\n        this.middleware = configuration.middleware;",
  );
  for (const [name, type] of [
    ["response", "Response"],
    ["cause", "Error"],
    ["field", "string"],
  ]) {
    result = replaceExact(
      result,
      `constructor(public ${name}: ${type}, msg?: string) {\n        super(msg);`,
      `public ${name}: ${type};\n    constructor(${name}: ${type}, msg?: string) {\n        super(msg);\n        this.${name} = ${name};`,
    );
  }
  result = replaceExact(
    result,
    "constructor(public raw: Response, private transformer: ResponseTransformer<T> = (jsonValue: any) => jsonValue) {}",
    "public raw: Response;\n    private transformer: ResponseTransformer<T>;\n    constructor(raw: Response, transformer: ResponseTransformer<T> = (jsonValue: any) => jsonValue) {\n        this.raw = raw;\n        this.transformer = transformer;\n    }",
  );
  return replaceExact(
    result,
    "constructor(public raw: Response) {}",
    "public raw: Response;\n    constructor(raw: Response) { this.raw = raw; }",
    3,
  );
}

const runtimePath = join(targetDirectory, "runtime.ts");
writeFileSync(
  runtimePath,
  normalize(adjustRuntime(readFileSync(runtimePath, "utf8"))),
);

const apiDirectory = join(targetDirectory, "apis");
for (const name of readdirSync(apiDirectory).filter((name) =>
  name.endsWith("Api.ts"),
)) {
  const path = join(apiDirectory, name);
  const source = readFileSync(path, "utf8");
  writeFileSync(path, normalize(replaceExact(source, "    ApiError,\n", "")));
}

for (const directory of [
  targetDirectory,
  apiDirectory,
  join(targetDirectory, "models"),
]) {
  for (const name of readdirSync(directory).filter((name) =>
    name.endsWith(".ts"),
  )) {
    const path = join(directory, name);
    writeFileSync(path, normalize(readFileSync(path, "utf8")));
  }
}
