import * as names from "./names";
import * as crypto from "./crypto";
import * as encoding from "./encoding";
import * as constants from "./constants";

export default class Client {

  private clientChallenge: Buffer;
  private clientRandomness: Buffer;
  private clientAdditionalData: Buffer = constants.BUFFER0;

  private username: string;
  private password: string;
  private location: string;

  private serverChallenge: Buffer;
  private serverRandomness: Buffer;
  private serverAdditionalData: Buffer = constants.BUFFER0;

  private userSeed: Buffer;
  private clientInternalSeed: Buffer;
  private serverInternalSeed: Buffer;

  private salt: Buffer;
  private storedPassword: Buffer;

  private clientKey: Buffer;
  private serverKey: Buffer;

  constructor () {
    this.clientRandomness = crypto.random(constants.SEED_LENGTH);
  }

  SetCredentials (username: string, password: string, location?: string): boolean {
    this.username = username;
    this.password = password;
    this.location = location;

    return true;
  }

  ClientFirst (additionalData?: Buffer): Buffer {
    if (additionalData) this.clientAdditionalData = crypto.hash(additionalData);
    this.clientChallenge = crypto.random(constants.CHALLENGE_LENGTH);
    this.clientRandomness = crypto.random(constants.SEED_LENGTH);

    return encoding.encode({
      [names.username]: this.username,
      ...(this.location === undefined ? {} : { [names.location]: this.location }),
      [names.clientRandomness]: this.clientRandomness,
      [names.clientChallenge]: this.clientChallenge,
    });
  }

  ServerFirst(_data: Buffer, additionalData?: Buffer): boolean {
    try {
      let data = encoding.decode(_data);

      if (
        typeof data[names.status] !== "number" || data[names.status] !== 0 ||
        !Buffer.isBuffer(data[names.salt]) ||
        !Buffer.isBuffer(data[names.userSeed]) ||
        !Buffer.isBuffer(data[names.serverChallenge]) ||
        !Buffer.isBuffer(data[names.serverRandomness]) ||
        !Buffer.isBuffer(data[names.clientInternalSeed]) ||
        !Buffer.isBuffer(data[names.serverInternalSeed])
      ) return false;

      let salt = data[names.salt];
      let userSeed = data[names.userSeed];
      let serverChallenge = data[names.serverChallenge];
      let serverRandomness = data[names.serverRandomness];
      let clientInternalSeed = data[names.clientInternalSeed];
      let serverInternalSeed = data[names.serverInternalSeed];


      if (
        salt.length !== constants.SEED_LENGTH ||
        userSeed.length !== constants.SEED_LENGTH ||
        serverChallenge.length !== constants.CHALLENGE_LENGTH ||
        serverRandomness.length !== constants.SEED_LENGTH ||
        clientInternalSeed.length !== constants.SEED_LENGTH ||
        serverInternalSeed.length !== constants.SEED_LENGTH
      ) return false;

      if (serverChallenge.equals(this.clientChallenge)) return false;

      if (additionalData) this.serverAdditionalData = crypto.hash(additionalData);
      this.salt = salt;
      this.userSeed = userSeed;
      this.serverChallenge = serverChallenge;
      this.serverRandomness = serverRandomness;
      this.clientInternalSeed = clientInternalSeed;
      this.serverInternalSeed = serverInternalSeed;

      this.storedPassword = crypto.password(this.password, this.salt, constants.HASH_LENGTH);
      this.clientKey = crypto.deriveKey(this.clientInternalSeed, this.storedPassword, constants.HASH_LENGTH, "ClientKey");
      this.serverKey = crypto.keyed(this.serverInternalSeed, this.clientKey);

      return true;
    } catch (err) {
      return false;
    }
  }

  ClientLast (): Buffer {
    let partialKey = crypto.deriveKey(this.userSeed, this.storedPassword, constants.HASH_LENGTH, "PartialKeyClient");
    let clientResponse = crypto.deriveKey(this.serverKey, Buffer.concat([this.serverChallenge, this.clientRandomness, this.serverRandomness, this.clientAdditionalData]), constants.HASH_LENGTH, "ClientResponse");

    return encoding.encode({
      [names.partialKey]: partialKey,
      [names.clientResponse]: clientResponse,
    });
  }

  ServerLast(_data: Buffer): boolean {
    try {
      let data = encoding.decode(_data);

      if (typeof data[names.status] !== "number" || data[names.status] !== 0) return false;

      let serverResponse = data[names.serverResponse];

      if (serverResponse.length !== constants.HASH_LENGTH) return false;

      let generatedServerResponse = crypto.deriveKey(this.serverKey, Buffer.concat([this.clientChallenge, this.serverRandomness, this.clientRandomness, this.serverAdditionalData]), constants.HASH_LENGTH, "ServerResponse");

      return crypto.timingSafeEqual(serverResponse, generatedServerResponse);
    } catch (err) {
      return false;
    }
  }
}