import * as crypto from "./crypto";
import * as constants from "./constants";
import * as encode2 from "./encode2";

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
      let data = encode2.Stored.read(_data);
      if (!data) return this.isValid = false;

      this.salt = data.Salt;
      this.userSeed = data.UserSeed;
      this.storedToken = data.StoredToken;
      this.clientInternalSeed = data.ClientInternalSeed;
      this.serverInternalSeed = data.ServerInternalSeed;
      this.serverPartialKeySeed = data.ServerPartialKeySeed;

      return this.isValid = true;
    } catch (err) {
      return this.isValid = false;
    }
  }

  ClientFirst (_data: Buffer, additionalData?: Buffer): boolean {
    try {
      let data = encode2.ClientFirst.read(_data);
      if (!data) return this.isValid = false;

      this.username = data.Username;
      this.location = data.Location;
      let clientChallenge = data.ClientChallenge;
      let clientRandomness = data.ClientRandomness;

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
      if (!this.isValid || !this.storedToken) return encode2.ServerFirst.write({ Status: 1 });

      if (additionalData) this.serverAdditionalData = crypto.hash(additionalData);
      this.serverChallenge = crypto.random(constants.CHALLENGE_LENGTH);
      this.serverRandomness = crypto.random(constants.SEED_LENGTH);

      while (this.serverChallenge.equals(this.clientChallenge)) this.serverChallenge = crypto.random(constants.SEED_LENGTH);

      return encode2.ServerFirst.write({
        Status: 0,
        Salt: this.salt,
        UserSeed: this.userSeed,
        ServerChallenge: this.serverChallenge,
        ServerRandomness: this.serverRandomness,
        ClientInternalSeed: this.clientInternalSeed,
        ServerInternalSeed: this.serverInternalSeed,
      });
    } catch (err) {
      return null;
    }
  }

  ClientLast (_data: Buffer): boolean {
    try {
      let data = encode2.ClientLast.read(_data);
      if (!data) return this.isValid = false;

      let partialKey = data.PartialKey;
      let clientResponse = data.ClientResponse;

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
      if (!this.isValid) return encode2.ServerLast.write({ Status: 1 });


      let serverResponse = crypto.deriveKey(this.decryptedStoredToken, Buffer.concat([this.clientChallenge, this.serverRandomness, this.clientRandomness, this.serverAdditionalData]), constants.HASH_LENGTH, "ServerResponse");

      return encode2.ServerLast.write({
        Status: 0,
        ServerResponse: serverResponse,
      });
    } catch (err) {
      return null;
    }
  }
}