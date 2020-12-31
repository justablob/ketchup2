import * as msgpack from "msgpack-lite";

export function encode<T extends any = any> (data: T): Buffer {
  return msgpack.encode(data);
}

export function decode<T extends any = any> (data: Buffer): T {
  return msgpack.decode(data);
}

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