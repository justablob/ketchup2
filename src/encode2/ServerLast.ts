import { Identifiers } from "./";
import Advanceable from "advanceable";

import * as constants from "../constants";

export interface ServerLast {
  Status: number;
  ServerResponse?: Buffer;
}

export function is (obj: any): obj is ServerLast {
  return (
    obj != null &&
    typeof obj.Status === "number" && (
      (
        obj.Status === 0 &&
        Buffer.isBuffer(obj.ServerResponse) && obj.ServerResponse.length === constants.HASH_LENGTH
      ) || (
        obj.Status === 1
      )
    )
  );
}


export function length (obj: ServerLast) {
  if (obj.Status === 0) {
    return (
      2 +
      constants.HASH_LENGTH
    );
  } else {
    return 2;
  }
}

export function read (buffer: Buffer): ServerLast {
  let reader = new Advanceable(buffer);

  if (!reader.available(2)) return null;
  if (reader.read(1)[0] !== Identifiers.ServerLast) return null;
  let Status = reader.read(1)[0];

  if (Status === 0) {
    if (!reader.available(constants.HASH_LENGTH)) return null;
    let ServerResponse = reader.read(constants.HASH_LENGTH);

    return {
      Status,
      ServerResponse,
    };
  } else {
    return {
      Status,
    };
  }
}

export function write (obj: ServerLast, buffer?: Buffer) {
  if (!is(obj)) return null;

  let writer = new Advanceable(buffer || length(obj), true);

  writer.write([Identifiers.ServerLast, obj.Status]);
  if (obj.Status === 0) {
    writer.write(obj.ServerResponse);
  }

  return writer.buffer;
}