import * as names from "./names";
import * as crypto from "./crypto";
import * as encoding from "./encoding";
import * as constants from "./constants";

export default class Server {

  public isValid: boolean = false;

  private clientChallenge: Buffer;
  private clientRandomness: Buffer;
  private clientAdditionalData: Buffer = constants.BUFFER0;

  public username: string;
  public location: string;

  private serverChallenge: Buffer;
  private serverRandomness: Buffer;
  private serverAdditionalData: Buffer = constants.BUFFER0;

  private salt: Buffer;
  private userSeed: Buffer;
  private storedToken: Buffer;
  private clientInternalSeed: Buffer;
  private serverInternalSeed: Buffer;
  private serverPartialKeySeed: Buffer;

  private decryptedStoredToken: Buffer;

  constructor () {
    this.clientRandomness = crypto.random(constants.SEED_LENGTH);
  }

  SetStored (_data?: Buffer | false): boolean {
    if (!_data) return this.isValid = false;
    try {
      let data = encoding.decode(_data);

      this.salt = data[names.salt];
      this.userSeed = data[names.userSeed];
      this.storedToken = data[names.storedToken];
      this.clientInternalSeed = data[names.clientInternalSeed];
      this.serverInternalSeed = data[names.serverInternalSeed];
      this.serverPartialKeySeed = data[names.serverPartialKeySeed];

      return this.isValid = true;
    } catch (err) {
      return this.isValid = false;
    }
  }

  ClientFirst (_data: Buffer, additionalData?: Buffer): boolean {
    try {
      let data = encoding.decode(_data);
      if (
        typeof data[names.username] !== "string" ||
        (data[names.location] !== undefined && typeof data[names.location] !== "string") ||
        !Buffer.isBuffer(data[names.clientChallenge]) ||
        !Buffer.isBuffer(data[names.clientRandomness])
      ) return this.isValid = false;

      this.username = data[names.username];
      this.location = data[names.location];
      let clientChallenge = data[names.clientChallenge];
      let clientRandomness = data[names.clientRandomness];

      if (
        clientChallenge.length !== constants.CHALLENGE_LENGTH ||
        clientRandomness.length !== constants.SEED_LENGTH
      ) return this.isValid = false;

      if (additionalData) this.clientAdditionalData = crypto.hash(additionalData);
      this.clientChallenge = clientChallenge;
      this.clientRandomness = clientRandomness;

      return this.isValid = true;
    } catch (err) {
      return this.isValid = false;
    }
  }

  ServerFirst (additionalData?: Buffer): Buffer {
    try {
      if (!this.isValid || !this.storedToken) return encoding.encode({ status: 1 });

      if (additionalData) this.serverAdditionalData = crypto.hash(additionalData);
      this.serverChallenge = crypto.random(constants.CHALLENGE_LENGTH);
      this.serverRandomness = crypto.random(constants.SEED_LENGTH);

      while (this.serverChallenge.equals(this.clientChallenge)) this.serverChallenge = crypto.random(constants.SEED_LENGTH);

      return encoding.encode({
        [names.status]: 0,
        [names.salt]: this.salt,
        [names.userSeed]: this.userSeed,
        [names.serverChallenge]: this.serverChallenge,
        [names.serverRandomness]: this.serverRandomness,
        [names.clientInternalSeed]: this.clientInternalSeed,
        [names.serverInternalSeed]: this.serverInternalSeed,
      });
    } catch (err) {
      return null;
    }
  }

  ClientLast (_data: Buffer): boolean {
    try {
      let data = encoding.decode(_data);

      if (
        !Buffer.isBuffer(data[names.partialKey]) ||
        !Buffer.isBuffer(data[names.clientResponse])
      ) return this.isValid = false;

      let partialKey = data[names.partialKey];
      let clientResponse = data[names.clientResponse];

      if (
        partialKey.length !== constants.HASH_LENGTH ||
        clientResponse.length !== constants.HASH_LENGTH
      ) return this.isValid = false;

      let storedTokenKey = crypto.deriveKey(this.serverPartialKeySeed, partialKey, constants.CIPHER_KEY_LENGTH, "PartialKey");

      this.decryptedStoredToken = crypto.decryptIV(storedTokenKey, this.storedToken);

      let generatedClientResponse = crypto.deriveKey(this.decryptedStoredToken, Buffer.concat([this.serverChallenge, this.clientRandomness, this.serverRandomness, this.clientAdditionalData]), constants.HASH_LENGTH, "ClientResponse");

      return this.isValid = crypto.timingSafeEqual(clientResponse, generatedClientResponse);
    } catch (err) {
      return false;
    }
  }

  GetSharedKey (key: Buffer = constants.BUFFER0): Buffer {
    let unmixedSharedKey = crypto.keyed(key, Buffer.concat([this.clientChallenge, this.serverChallenge]));
    let mixedSharedKey = crypto.keyed(this.decryptedStoredToken, unmixedSharedKey);

    return mixedSharedKey;
  }

  ServerLast (): Buffer {
    try {
      if (!this.isValid) return encoding.encode({ [names.status]: 1 });

      let serverResponse = crypto.deriveKey(this.decryptedStoredToken, Buffer.concat([this.clientChallenge, this.serverRandomness, this.clientRandomness, this.serverAdditionalData]), constants.HASH_LENGTH, "ServerResponse");

      return encoding.encode({
        [names.status]: 0,
        [names.serverResponse]: serverResponse,
      });
    } catch (err) {
      return null;
    }
  }
}