import { Identifiers } from "./";
import Advanceable from "advanceable";

import * as constants from "../constants";

export interface ClientFirst {
  Username: string;
  Location?: string;
  ClientRandomness: Buffer;
  ClientChallenge: Buffer;
}

export function is (obj: any): obj is ClientFirst {
  return (
    obj != null &&
    typeof obj.Username === "string" && obj.Username.length <= 255 &&
    (typeof obj.Location === "undefined" || (typeof obj.Location === "string" && obj.Location.length <= 255)) &&
    Buffer.isBuffer(obj.ClientRandomness) && obj.ClientRandomness.length === constants.SEED_LENGTH &&
    Buffer.isBuffer(obj.ClientChallenge) && obj.ClientChallenge.length === constants.CHALLENGE_LENGTH
  );
}

export function length (obj: ClientFirst) {
  return (
    3 +
    Buffer.byteLength(obj.Username) +
    (obj.Location ? Buffer.byteLength(obj.Location) : 0) +
    constants.SEED_LENGTH +
    constants.CHALLENGE_LENGTH
  );
}

export function read (buffer: Buffer): ClientFirst {
  let reader = new Advanceable(buffer);

  if (reader.readByte() !== Identifiers.ClientFirst) return null;

  let usernameLength = reader.readByte();

  if (usernameLength == null) return null;

  let Username = reader.readString(usernameLength, "utf8");

  let locationLength = reader.readByte();

  if (locationLength == null) return null;

  let Location = locationLength === 0 ? undefined : reader.readString(locationLength, "utf8");

  let ClientRandomness = reader.read(constants.SEED_LENGTH);
  let ClientChallenge = reader.read(constants.CHALLENGE_LENGTH);

  if (!Username || !ClientChallenge || !ClientRandomness) return null;

  return {
    Username,
    Location,
    ClientRandomness,
    ClientChallenge,
  };
}

export function write (obj: ClientFirst, buffer?: Buffer) {
  if (!is(obj)) return null;

  let usernameLength = Buffer.byteLength(obj.Username);
  let locationLength = obj.Location ? Buffer.byteLength(obj.Location) : 0;

  let writer = new Advanceable(buffer || length(obj), true);

  writer.write([Identifiers.ClientFirst, usernameLength]);
  writer.writeString(obj.Username);
  writer.write([locationLength]);
  if (locationLength) writer.writeString(obj.Location);
  writer.write(obj.ClientRandomness);
  writer.write(obj.ClientChallenge);

  return writer.buffer;
}