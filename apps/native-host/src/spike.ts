import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const directory = await mkdtemp(path.join(tmpdir(), "screen-assistant-spike-"));
const imagePath = path.join(directory, "capture.png");

function run(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: directory, shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve(stdout) : reject(new Error(stderr || stdout || `${command} exited ${code}`)));
  });
}

try {
  await run("magick", ["-size", "640x240", "xc:white", "-fill", "#111827", "-pointsize", "36", "-gravity", "center", "-annotate", "0", "BUILD FAILED\nExit code 42", imagePath]);
  const output = await run(process.env.CLAUDE_BIN || "claude", [
    "-p", "Use Read to inspect ./capture.png. State the visible headline and exit code.",
    "--output-format", "json", "--no-session-persistence", "--permission-mode", "dontAsk", "--tools", "Read"
  ]);
  const parsed = JSON.parse(output) as { result?: string; is_error?: boolean };
  if (parsed.is_error || !parsed.result?.includes("42")) throw new Error(parsed.result || "Claude did not identify exit code 42.");
  console.log(`Vision spike passed: ${parsed.result}`);
} finally {
  await rm(directory, { recursive: true, force: true });
}

