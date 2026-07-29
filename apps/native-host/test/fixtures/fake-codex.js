#!/usr/bin/env node
import { writeFileSync } from "node:fs";
const outputFlag = process.argv.indexOf("--output-last-message");
if (outputFlag < 0 || !process.argv[outputFlag + 1]) process.exit(2);
writeFileSync(process.argv[outputFlag + 1], "The fake Codex saw the screenshot.");
