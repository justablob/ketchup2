import { Identifiers } from "./";
import Advanceable from "advanceable";

import * as constants from "../constants";

export interface Stored {
  Salt: Buffer;
  UserSeed: Buffer;
  ClientInternalSeed: Buffer;
  ServerInternalSeed: Buffer;
  ServerPartialKeySeed: Buffer;
  StoredToken: Buffer;
}

export function is (obj: any): obj is Stored {
  return (
    obj != null &&
    Buffer.isBuffer(obj.Salt) && obj.Salt.length === constants.SEED_LENGTH &&
    Buffer.isBuffer(obj.UserSeed) && obj.UserSeed.length === constants.SEED_LENGTH &&
    Buffer.isBuffer(obj.ClientInternalSeed) && obj.ClientInternalSeed.length === constants.SEED_LENGTH &&
    Buffer.isBuffer(obj.ServerInternalSeed) && obj.ServerInternalSeed.length === constants.SEED_LENGTH &&
    Buffer.isBuffer(obj.ServerPartialKeySeed) && obj.ServerPartialKeySeed.length === constants.SEED_LENGTH &&
    Buffer.isBuffer(obj.StoredToken) && obj.StoredToken.length === constants.CIPHER_IV_LENGTH + constants.HASH_LENGTH + constants.CIPHER_TAG_LENGTH
  );
}

export function length (obj: Stored) {
  return (
    1 +
    5 * constants.SEED_LENGTH +
    constants.CIPHER_IV_LENGTH +
    constants.HASH_LENGTH +
    constants.CIPHER_TAG_LENGTH
  );
}

export function read (buffer: Buffer): Stored {
  let reader = new Advanceable(buffer);

  if (reader.readByte() !== Identifiers.Stored) return null;

  let Salt = reader.read(constants.SEED_LENGTH);
  let UserSeed = reader.read(constants.SEED_LENGTH);
  let ClientInternalSeed = reader.read(constants.SEED_LENGTH);
  let ServerInternalSeed = reader.read(constants.SEED_LENGTH);
  let ServerPartialKeySeed = reader.read(constants.SEED_LENGTH);
  let StoredToken = reader.read(constants.CIPHER_IV_LENGTH + constants.HASH_LENGTH + constants.CIPHER_TAG_LENGTH);

  if (!Salt || !UserSeed || !ClientInternalSeed || !ServerInternalSeed || !ServerPartialKeySeed || !StoredToken) return null;

  return {
    Salt,
    UserSeed,
    ClientInternalSeed,
    ServerInternalSeed,
    ServerPartialKeySeed,
    StoredToken,
  };
}

export function write (obj: Stored, buffer?: Buffer) {
  if (!is(obj)) return null;

  let writer = new Advanceable(buffer || length(obj), true);

  writer.write([Identifiers.Stored]);
  writer.write(obj.Salt);
  writer.write(obj.UserSeed);
  writer.write(obj.ClientInternalSeed);
  writer.write(obj.ServerInternalSeed);
  writer.write(obj.ServerPartialKeySeed);
  writer.write(obj.StoredToken);

  return writer.buffer;
}