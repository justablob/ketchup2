import { Identifiers } from "./";
import Advanceable from "advanceable";

import * as constants from "../constants";

export interface PreStored {
  Username: string;
  Location?: string;
  Salt: Buffer;
  UserSeed: Buffer;
  ClientInternalSeed: Buffer;
  PartialKey: Buffer;
  ClientSeeded: Buffer;
}

export function is (obj: any): obj is PreStored {
  return (
    obj != null &&
    typeof obj.Username === "string" && obj.Username.length <= 255 &&
    (typeof obj.Location === "undefined" || (typeof obj.Location === "string" && obj.Location.length <= 255)) &&
    Buffer.isBuffer(obj.Salt) && obj.Salt.length === constants.SEED_LENGTH &&
    Buffer.isBuffer(obj.UserSeed) && obj.UserSeed.length === constants.SEED_LENGTH &&
    Buffer.isBuffer(obj.ClientInternalSeed) && obj.ClientInternalSeed.length === constants.SEED_LENGTH &&
    Buffer.isBuffer(obj.PartialKey) && obj.PartialKey.length === constants.HASH_LENGTH &&
    Buffer.isBuffer(obj.ClientSeeded) && obj.ClientSeeded.length === constants.HASH_LENGTH
  );
}

export function length (obj: PreStored) {
  return (
    3 +
    Buffer.byteLength(obj.Username) +
    (obj.Location ? Buffer.byteLength(obj.Location) : 0) +
    3 * constants.SEED_LENGTH +
    2 * constants.HASH_LENGTH
  );
}

export function read (buffer: Buffer): PreStored {
  let reader = new Advanceable(buffer);

  if (reader.readByte() !== Identifiers.PreStored) return null;

  let usernameLength = reader.readByte();

  if (usernameLength == null) return null;

  let Username = reader.read(usernameLength)?.toString("utf8");

  let locationLength = reader.readByte();

  if (locationLength == null) return null;

  let Location = locationLength === 0 ? undefined : reader.read(locationLength).toString("utf8");

  let Salt = reader.read(constants.SEED_LENGTH);
  let UserSeed = reader.read(constants.SEED_LENGTH);
  let ClientInternalSeed = reader.read(constants.SEED_LENGTH);
  let PartialKey = reader.read(constants.HASH_LENGTH);
  let ClientSeeded = reader.read(constants.HASH_LENGTH);

  if (!Salt || !UserSeed || !ClientInternalSeed || !PartialKey || !ClientSeeded) return null;

  return {
    Username,
    Location,
    Salt,
    UserSeed,
    ClientInternalSeed,
    PartialKey,
    ClientSeeded,
  };
}

export function write (obj: PreStored, buffer?: Buffer) {
  if (!is(obj)) return null;

  let usernameLength = Buffer.byteLength(obj.Username);
  let locationLength = obj.Location ? Buffer.byteLength(obj.Location) : 0;

  let writer = new Advanceable(buffer || length(obj), true);

  writer.write([Identifiers.PreStored, usernameLength]);
  writer.write(obj.Username);
  writer.write([locationLength]);
  if (locationLength) writer.write(obj.Location);
  writer.write(obj.Salt);
  writer.write(obj.UserSeed);
  writer.write(obj.ClientInternalSeed);
  writer.write(obj.PartialKey);
  writer.write(obj.ClientSeeded);

  return writer.buffer;
}