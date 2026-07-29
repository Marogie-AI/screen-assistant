import { spawn } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";

const host = path.join(homedir(), ".screen-assistant/bin/native-host");
const request = {
  type: "analyze",
  requestId: "ad95bf70-68a2-4b96-b31c-6b171ea53db8",
  screenshotDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL3WQAAAABJRU5ErkJggg==",
  question: "Reply with exactly OK."
};
const payload = Buffer.from(JSON.stringify(request));
const frame = Buffer.alloc(4 + payload.length);
frame.writeUInt32LE(payload.length, 0);
payload.copy(frame, 4);

const child = spawn(host, [], {
  env: { HOME: homedir(), PATH: "/usr/bin:/bin" },
  stdio: ["pipe", "pipe", "pipe"]
});
let stdout = Buffer.alloc(0);
let stderr = "";
let receivedResponse = false;
const timeout = setTimeout(() => {
  console.error("Installed host smoke test timed out.");
  child.kill("SIGKILL");
  process.exitCode = 1;
}, 120_000);

child.stdout.on("data", chunk => {
  stdout = Buffer.concat([stdout, chunk]);
  if (stdout.length < 4) return;
  const length = stdout.readUInt32LE(0);
  if (stdout.length < 4 + length) return;
  const response = JSON.parse(stdout.subarray(4, 4 + length).toString("utf8"));
  receivedResponse = true;
  clearTimeout(timeout);
  console.log(JSON.stringify(response, null, 2));
  if (response.type !== "result" || response.answer !== "OK") process.exitCode = 1;
  child.kill("SIGTERM");
});
child.stderr.on("data", chunk => { stderr += chunk.toString("utf8"); });
child.on("close", code => {
  clearTimeout(timeout);
  if (!receivedResponse) {
    console.error(stderr);
    process.exitCode = code || 1;
  }
});
child.stdin.end(frame);
