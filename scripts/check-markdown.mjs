import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const excludedDirectories = new Set([".git", "dist", "node_modules"]);
const errors = [];

async function collectMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectMarkdownFiles(entryPath));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(entryPath);
  }
  return files;
}

function report(file, line, message) {
  errors.push(`${path.relative(root, file)}:${line}: ${message}`);
}

async function checkLocalLinks(file, content) {
  const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of content.matchAll(linkPattern)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "").split(/\s+["']/)[0];
    if (!rawTarget || /^(?:https?:|mailto:|#)/.test(rawTarget)) continue;
    const target = decodeURIComponent(rawTarget.split("#")[0]);
    const resolved = path.resolve(path.dirname(file), target);
    try {
      await stat(resolved);
    } catch {
      const line = content.slice(0, match.index).split("\n").length;
      report(file, line, `local link target does not exist: ${target}`);
    }
  }
}

function checkStructure(file, content) {
  const relative = path.relative(root, file);
  const lines = content.split("\n");
  let inFence = false;
  let previousHeadingLevel = 0;
  let h1Count = 0;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (/\s+$/.test(line)) report(file, lineNumber, "trailing whitespace");
    if (/^```/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    const heading = /^(#{1,6})\s+\S/.exec(line);
    if (!heading) return;
    const level = heading[1].length;
    if (level === 1) h1Count += 1;
    if (previousHeadingLevel && level > previousHeadingLevel + 1) {
      report(file, lineNumber, `heading level jumps from H${previousHeadingLevel} to H${level}`);
    }
    previousHeadingLevel = level;
  });

  if (inFence) report(file, lines.length, "unclosed fenced code block");
  if (!relative.startsWith(`.github${path.sep}`) && h1Count !== 1) {
    report(file, 1, `expected exactly one H1 heading, found ${h1Count}`);
  }
  if (!content.endsWith("\n")) report(file, lines.length, "missing final newline");
}

const files = (await collectMarkdownFiles(root)).sort();
for (const file of files) {
  const content = await readFile(file, "utf8");
  checkStructure(file, content);
  await checkLocalLinks(file, content);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Markdown check passed for ${files.length} files.`);
}
