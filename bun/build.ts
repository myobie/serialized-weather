import { readdir, rmdir } from "node:fs/promises";

console.debug("Building frontend...");

await rmdir("./dist/", { recursive: true });
const files = await readdir("./src/");

const elements = files
  .filter((file) => file.endsWith("-element.ts"))
  .map((file) => `./src/${file}`);

console.debug(elements);

const result = await Bun.build({
  entrypoints: elements,
  outdir: "./dist",
  splitting: true,
  external: ["#dom"],
  sourcemap: "external",
  minify: true,
});

if (!result.success) {
  console.error(result);
}
