import { Identifiers } from "./";
import Advanceable from "advanceable";

import * as constants from "../constants";

export interface ClientLast {
  PartialKey: Buffer;
  ClientResponse: Buffer;
}

export function is (obj: any): obj is ClientLast {
  return (
    obj != null &&
    Buffer.isBuffer(obj.PartialKey) && obj.PartialKey.length === constants.HASH_LENGTH &&
    Buffer.isBuffer(obj.ClientResponse) && obj.ClientResponse.length === constants.HASH_LENGTH
  );
}

export function length (obj: ClientLast) {
  return (
    1 +
    2 * constants.HASH_LENGTH
  );
}

export function read (buffer: Buffer): ClientLast {
  let reader = new Advanceable(buffer);

  if (reader.readByte() !== Identifiers.ClientLast) return null;

  let PartialKey = reader.read(constants.HASH_LENGTH);
  let ClientResponse = reader.read(constants.HASH_LENGTH);

  if (!PartialKey || !ClientResponse) return null;

  return {
    PartialKey,
    ClientResponse,
  };
}

export function write (obj: ClientLast, buffer?: Buffer) {
  if (!is(obj)) return null;

  let writer = new Advanceable(buffer || length(obj), true);

  writer.write([Identifiers.ClientLast]);
  writer.write(obj.PartialKey);
  writer.write(obj.ClientResponse);

  return writer.buffer;
}