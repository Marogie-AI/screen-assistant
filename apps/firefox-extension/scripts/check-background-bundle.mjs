import { readFile } from "node:fs/promises";

const background = await readFile(new URL("../dist/background.js", import.meta.url), "utf8");

if (/^\s*(?:import|export)\b/m.test(background)) {
  throw new Error("background.js contains ES-module syntax, but Firefox loads it as a classic background script.");
}

console.log("background.js is a self-contained classic script.");
