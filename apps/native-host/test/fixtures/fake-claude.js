#!/usr/bin/env node
process.stdout.write(JSON.stringify({
  type: "result",
  is_error: false,
  result: "The fake Claude saw the screenshot."
}));

