import * as crypto from "./crypto";
import * as encode2 from "./encode2";
import * as constants from "./constants";

export function ClientCreatePassword(username: string, password: string, location?: string): Buffer {
  try {
    let salt = crypto.random(constants.SEED_LENGTH);
    let userSeed = crypto.random(constants.SEED_LENGTH);
    let clientInternalSeed = crypto.random(constants.SEED_LENGTH);

    let storedPassword = crypto.password(password, salt, constants.HASH_LENGTH);
    let partialKey = crypto.deriveKey(userSeed, storedPassword, constants.HASH_LENGTH, "PartialKeyClient");
    let clientSeeded = crypto.deriveKey(clientInternalSeed, storedPassword, constants.HASH_LENGTH, "ClientKey");

    return encode2.PreStored.write({
      Username: username,
      ...(location === undefined ? {} : { Location: location }),
      Salt: salt,
      UserSeed: userSeed,
      ClientInternalSeed: clientInternalSeed,
      PartialKey: partialKey,
      ClientSeeded: clientSeeded,
    });
  } catch (err) {
    return null;
  }
};

export function ServerCreatePassword(_data: Buffer): [string, string, Buffer] {
  try {
    let data = encode2.PreStored.read(_data);
    if (!data) return null;

    let salt = data.Salt;
    let userSeed = data.UserSeed;
    let clientInternalSeed = data.ClientInternalSeed;
    let partialKey = data.PartialKey;
    let clientSeeded = data.ClientSeeded;

    let serverInternalSeed = crypto.random(constants.SEED_LENGTH);
    let serverPartialKeySeed = crypto.random(constants.SEED_LENGTH);

    let serverSeeded = crypto.keyed(serverInternalSeed, clientSeeded);
    let serverPartialKey = crypto.deriveKey(serverPartialKeySeed, partialKey, constants.CIPHER_KEY_LENGTH, "PartialKey");

    let encrypted = crypto.encryptIV(serverPartialKey, serverSeeded);

    return [
      data.Username,
      data.Location,
      encode2.Stored.write({
        StoredToken: encrypted,
        Salt: salt,
        UserSeed: userSeed,
        ServerPartialKeySeed: serverPartialKeySeed,
        ClientInternalSeed: clientInternalSeed,
        ServerInternalSeed: serverInternalSeed,
      }),
    ];
  } catch (err) {
    return null;
  }
}