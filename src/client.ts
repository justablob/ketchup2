import * as crypto from "./crypto";
import * as constants from "./constants";
import * as encode2 from "./encode2";

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

    return encode2.ClientFirst.write({
      Username: this.username,
      ...(this.location === undefined ? {} : { Location: this.location }),
      ClientRandomness: this.clientRandomness,
      ClientChallenge: this.clientChallenge,
    });
  }

  ServerFirst(_data: any, additionalData?: Buffer): boolean {
    try {
      let data = encode2.ServerFirst.read(_data);
      if (!data || data.Status !== 0) return false;

      let salt = data.Salt;
      let userSeed = data.UserSeed;
      let serverChallenge = data.ServerChallenge;
      let serverRandomness = data.ServerRandomness;
      let clientInternalSeed = data.ClientInternalSeed;
      let serverInternalSeed = data.ServerInternalSeed;

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

    return encode2.ClientLast.write({
      PartialKey: partialKey,
      ClientResponse: clientResponse,
    });
  }

  GetSharedKey (key: Buffer = constants.BUFFER0): Buffer {
    let premixedSharedKey = crypto.keyed(key, Buffer.concat([this.clientChallenge, this.serverChallenge]));
    let mixedSharedKey = crypto.keyed(this.serverKey, premixedSharedKey);

    return mixedSharedKey;
  }

  ServerLast(_data: Buffer): boolean {
    try {
      let data = encode2.ServerLast.read(_data);
      if (!data || data.Status !== 0) return false;

      let serverResponse = data.ServerResponse;
      let generatedServerResponse = crypto.deriveKey(this.serverKey, Buffer.concat([this.clientChallenge, this.serverRandomness, this.clientRandomness, this.serverAdditionalData]), constants.HASH_LENGTH, "ServerResponse");

      return crypto.timingSafeEqual(serverResponse, generatedServerResponse);
    } catch (err) {
      return false;
    }
  }
}