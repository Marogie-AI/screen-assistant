import { describe, expect, it } from "vitest";
import { NativeMessageDecoder, encodeMessage } from "../src/native-io.js";

describe("native messaging framing", () => {
  it("decodes split and consecutive frames", async () => {
    const decoder = new NativeMessageDecoder();
    const messages: unknown[] = [];
    decoder.on("data", message => messages.push(message));
    const bytes = Buffer.concat([encodeMessage({ one: 1 }), encodeMessage({ two: 2 })]);
    decoder.write(bytes.subarray(0, 7));
    decoder.end(bytes.subarray(7));
    await new Promise(resolve => decoder.on("end", resolve));
    expect(messages).toEqual([{ one: 1 }, { two: 2 }]);
  });
});

