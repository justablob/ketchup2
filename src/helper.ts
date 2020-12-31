import * as names from "./names";
import * as crypto from "./crypto";
import * as encoding from "./encoding";
import * as constants from "./constants";

export function ClientCreatePassword(username: string, password: string, location?: string): Buffer {
  try {
    let salt = crypto.random(constants.SEED_LENGTH);
    let userSeed = crypto.random(constants.SEED_LENGTH);
    let clientInternalSeed = crypto.random(constants.SEED_LENGTH);

    let storedPassword = crypto.password(password, salt, constants.HASH_LENGTH);
    let partialKey = crypto.deriveKey(userSeed, storedPassword, constants.HASH_LENGTH, "PartialKeyClient");
    let clientSeeded = crypto.deriveKey(clientInternalSeed, storedPassword, constants.HASH_LENGTH, "ClientKey");

    return encoding.encode({
      [names.username]: username,
      ...(location === undefined ? {} : { [names.location]: location }),
      [names.salt]: salt,
      [names.userSeed]: userSeed,
      [names.clientInternalSeed]: clientInternalSeed,
      [names.partialKey]: partialKey,
      [names.clientSeeded]: clientSeeded,
    });
  } catch (err) {
    return null;
  }
};

export function ServerCreatePassword(_data: Buffer): [string, string, Buffer] {
  try {
    let data = encoding.decode(_data);

    if (
      typeof data[names.username] !== "string" ||
      (data[names.location] !== undefined && typeof data[names.location] !== "string") ||
      !Buffer.isBuffer(data[names.salt]) ||
      !Buffer.isBuffer(data[names.userSeed]) ||
      !Buffer.isBuffer(data[names.clientInternalSeed]) ||
      !Buffer.isBuffer(data[names.partialKey]) ||
      !Buffer.isBuffer(data[names.clientSeeded])
    ) return null;

    let salt = data[names.salt];
    let userSeed = data[names.userSeed];
    let clientInternalSeed = data[names.clientInternalSeed];
    let partialKey = data[names.partialKey];
    let clientSeeded = data[names.clientSeeded];

    if (
      salt.length !== constants.SEED_LENGTH ||
      userSeed.length !== constants.SEED_LENGTH ||
      clientInternalSeed.length !== constants.SEED_LENGTH ||
      partialKey.length !== constants.HASH_LENGTH ||
      clientSeeded.length !== constants.HASH_LENGTH
    ) return null;

    let serverInternalSeed = crypto.random(constants.SEED_LENGTH);
    let serverSeeded = crypto.keyed(serverInternalSeed, clientSeeded);

    let encrypted = crypto.encryptIV(crypto.deriveKey(encoding.UTF8ToBytes("PartialKey"), partialKey, constants.CIPHER_KEY_LENGTH), serverSeeded);

    return [
      data[names.username],
      data[names.location],
      encoding.encode({
        [names.storedToken]: encrypted,
        [names.salt]: salt,
        [names.userSeed]: userSeed,
        [names.clientInternalSeed]: clientInternalSeed,
        [names.serverInternalSeed]: serverInternalSeed,
      })
    ];
  } catch (err) {
    return null;
  }
}