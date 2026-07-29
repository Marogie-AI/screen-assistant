import { Transform } from "node:stream";
import { HostError } from "./errors.js";

const MAX_NATIVE_MESSAGE_BYTES = 16 * 1024 * 1024;

export function encodeMessage(message: unknown): Buffer {
  const payload = Buffer.from(JSON.stringify(message), "utf8");
  const header = Buffer.allocUnsafe(4);
  header.writeUInt32LE(payload.byteLength, 0);
  return Buffer.concat([header, payload]);
}

export class NativeMessageDecoder extends Transform {
  private pending = Buffer.alloc(0);

  constructor() {
    super({ readableObjectMode: true });
  }

  override _transform(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error) => void): void {
    try {
      this.pending = Buffer.concat([this.pending, chunk]);
      while (this.pending.length >= 4) {
        const length = this.pending.readUInt32LE(0);
        if (length > MAX_NATIVE_MESSAGE_BYTES) {
          throw new HostError("INVALID_REQUEST", "Native message exceeds the 16 MB limit.");
        }
        if (this.pending.length < 4 + length) break;
        const payload = this.pending.subarray(4, 4 + length);
        this.pending = this.pending.subarray(4 + length);
        this.push(JSON.parse(payload.toString("utf8")));
      }
      callback();
    } catch (error) {
      callback(error as Error);
    }
  }
}

export function writeMessage(message: unknown): void {
  process.stdout.write(encodeMessage(message));
}

