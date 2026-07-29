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
  const answerPath = path.join(directory, "answer.txt");
  await run(process.env.CODEX_BIN || "codex", [
    "exec", "--image", imagePath, "--sandbox", "read-only", "--ephemeral",
    "--ignore-user-config", "--ignore-rules", "--skip-git-repo-check", "--color", "never",
    "--output-last-message", answerPath,
    "Inspect the attached screenshot. State the visible headline and exit code. Do not use tools."
  ]);
  const { readFile } = await import("node:fs/promises");
  const answer = await readFile(answerPath, "utf8");
  if (!answer.includes("42")) throw new Error(answer || "Codex did not identify exit code 42.");
  console.log(`Vision spike passed: ${answer.trim()}`);
} finally {
  await rm(directory, { recursive: true, force: true });
}
