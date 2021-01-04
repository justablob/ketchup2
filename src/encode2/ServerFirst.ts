import { Identifiers } from "./";
import Advanceable from "./Advanceable";

import * as constants from "../constants";

export interface ServerFirst {
  Status: number;
  Salt?: Buffer;
  UserSeed?: Buffer;
  ServerChallenge?: Buffer;
  ServerRandomness?: Buffer;
  ClientInternalSeed?: Buffer;
  ServerInternalSeed?: Buffer;
}

export function is (obj: any): obj is ServerFirst {
  return (
    obj != null &&
    typeof obj.Status === "number" && (
      (
        obj.Status === 0 &&
        Buffer.isBuffer(obj.Salt) && obj.Salt.length === constants.SEED_LENGTH &&
        Buffer.isBuffer(obj.UserSeed) && obj.UserSeed.length === constants.SEED_LENGTH &&
        Buffer.isBuffer(obj.ServerChallenge) && obj.ServerChallenge.length === constants.CHALLENGE_LENGTH &&
        Buffer.isBuffer(obj.ServerRandomness) && obj.ServerRandomness.length === constants.SEED_LENGTH &&
        Buffer.isBuffer(obj.ClientInternalSeed) && obj.ClientInternalSeed.length === constants.SEED_LENGTH &&
        Buffer.isBuffer(obj.ServerInternalSeed) && obj.ServerInternalSeed.length === constants.SEED_LENGTH
      ) || (
        obj.Status === 1
      )
    )
  );
}

export function length (obj: ServerFirst) {
  if (obj.Status === 0) {
    return (
      2 +
      5 * constants.SEED_LENGTH +
      constants.CHALLENGE_LENGTH
    );
  } else {
    return 2;
  }
}

export function read (buffer: Buffer): ServerFirst {
  let reader = new Advanceable(buffer);

  if (!reader.available(2)) return null;
  if (reader.read(1)[0] !== Identifiers.ServerFirst) return null;
  let Status = reader.read(1)[0];

  if (Status === 0) {
    if (!reader.available(constants.CHALLENGE_LENGTH + 5 * constants.SEED_LENGTH)) return null;
    let Salt = reader.read(constants.SEED_LENGTH);
    let UserSeed = reader.read(constants.SEED_LENGTH);
    let ServerRandomness = reader.read(constants.SEED_LENGTH);
    let ServerChallenge = reader.read(constants.CHALLENGE_LENGTH);
    let ClientInternalSeed = reader.read(constants.SEED_LENGTH);
    let ServerInternalSeed = reader.read(constants.SEED_LENGTH);

    return {
      Status,
      Salt,
      UserSeed,
      ServerRandomness,
      ServerChallenge,
      ClientInternalSeed,
      ServerInternalSeed,
    };
  } else {
    return {
      Status,
    };
  }
}

export function write (obj: ServerFirst, buffer?: Buffer) {
  if (!is(obj)) return null;

  let writer = new Advanceable(buffer || length(obj), true);

  writer.write([Identifiers.ServerFirst, obj.Status]);
  if (obj.Status === 0) {
    writer.write(obj.Salt);
    writer.write(obj.UserSeed);
    writer.write(obj.ServerRandomness);
    writer.write(obj.ServerChallenge);
    writer.write(obj.ClientInternalSeed);
    writer.write(obj.ServerInternalSeed);
  }

  return writer.buffer;
}