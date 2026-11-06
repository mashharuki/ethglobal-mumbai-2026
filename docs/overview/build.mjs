import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { duration, renderFrame } from "./story.mjs";

const directory = fileURLToPath(new URL(".", import.meta.url));
const docs = join(directory, "..");
const readSource = (name) => readFileSync(join(directory, name), "utf8");
const icons = Object.fromEntries(
  ["smartphone", "server", "at-sign", "database", "wallet"].map((name) => {
    const source = readFileSync(
      join(docs, "assets/icons", `${name}.svg`),
      "utf8",
    );
    return [
      name,
      source.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>[\s\S]*$/, ""),
    ];
  }),
);
const script = `${readSource("story.mjs").replaceAll("export ", "")}\nconst icons = ${JSON.stringify(icons)};\n${readSource("player.js")}`;
const license = readFileSync(join(docs, "assets/icons/LICENSE"), "utf8");
const html = readSource("template.html")
  .replace("/* PLAYER_STYLE */", readSource("player.css"))
  .replace("/* PLAYER_SCRIPT */", script)
  .replace("<!-- INITIAL_FRAME -->", renderFrame(0, "en", icons))
  .replace(
    "<!-- ICON_LICENSE -->",
    `<!-- Lucide / Feather icons\n${license.replaceAll("--", "—")}\n-->`,
  );
writeFileSync(join(docs, "overview.html"), html);
console.log("Built self-contained docs/overview.html");
if (process.argv.includes("--frames")) {
  const output = join(tmpdir(), "mumbai-overview-frames");
  mkdirSync(output, { recursive: true });
  for (const language of ["en", "ja"]) {
    for (const index of Array.from(
      { length: duration * 8 },
      (_, number) => number,
    )) {
      writeFileSync(
        join(output, `${language}-${String(index).padStart(3, "0")}.svg`),
        renderFrame(index / 8, language, icons),
      );
    }
  }
  console.log(`Wrote 8 fps SVG frames to ${output}`);
}
