export function bytesToTransport(buffer: Buffer): string {
  return buffer.toString("base64");
}

export function transportToBytes(string: string): Buffer {
  return Buffer.from(string, "base64");
}

export function bytesToUTF8(buffer: Buffer): string {
  return buffer.toString("utf8");
}

export function UTF8ToBytes(string: string): Buffer {
  return Buffer.from(string, "utf8");
}