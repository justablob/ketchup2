import * as crypto from "crypto";
import * as hkdf from "futoin-hkdf";
import * as constants from "./constants";

export function timingSafeEqual <T extends string | Buffer> (a: T, b: T): boolean {
  let longer = Math.max(a.length, b.length);
  let match = true;

  for (let i = 0; i < longer; i++) {
    if (a[i] !== b[i]) {
      match = false;
    }
  }

  return match;
}

export function random(length: number): Buffer {
  return crypto.randomBytes(length);
}

export function hash(data: Buffer): Buffer {
  return crypto.createHash(constants.HASH).update(data).digest();
}

export function keyed(key: Buffer, data: Buffer): Buffer {
  return crypto.createHmac(constants.HASH, key).update(data).digest();
}

export function deriveKey(key: Buffer, data: Buffer, length: number = constants.HASH_LENGTH, info: Buffer | string = constants.BUFFER0) {
  if (typeof (crypto as any).hkdfSync === "function") {
    return Buffer.from((crypto as any).hkdfSync(constants.HASH, key, data, info, length));
  } else {
    return hkdf(data, length, { hash: constants.HASH, info: info, salt: key });
  }
}

export function password(password: string, salt: string | Buffer, length: number = constants.HASH_LENGTH) {
  return crypto.scryptSync(password, salt, length, constants.SCRYPT_PARAMS);
}

export function encrypt(key: Buffer, iv: Buffer, data: Buffer): Buffer {
  if (!Buffer.isBuffer(key) || key.length !== constants.CIPHER_KEY_LENGTH) return null;
  if (!Buffer.isBuffer(iv) || iv.length !== constants.CIPHER_IV_LENGTH) return null;

  let output = Buffer.alloc(data.length + constants.CIPHER_TAG_LENGTH);
  let cipher = crypto.createCipheriv(constants.CIPHER, key, iv, { authTagLength: constants.CIPHER_TAG_LENGTH });

  cipher.update(data).copy(output, constants.CIPHER_TAG_LENGTH);
  cipher.final();
  cipher.getAuthTag().copy(output);

  return output;
}

export function decrypt(key: Buffer, iv: Buffer, ciphertext: Buffer): Buffer {
  if (!Buffer.isBuffer(key) || key.length !== constants.CIPHER_KEY_LENGTH) return null;
  if (!Buffer.isBuffer(iv) || iv.length !== constants.CIPHER_IV_LENGTH) return null;

  let decipher = crypto.createDecipheriv(constants.CIPHER, key, iv, { authTagLength: constants.CIPHER_TAG_LENGTH });
  decipher.setAuthTag(ciphertext.slice(0, constants.CIPHER_TAG_LENGTH));
  let output = decipher.update(ciphertext.slice(constants.CIPHER_TAG_LENGTH));

  try {
    decipher.final();
    return output;
  } catch (err) {
    return null;
  }
}

export function encryptIV(key: Buffer, data: Buffer): Buffer {
  if (!Buffer.isBuffer(key) || key.length !== constants.CIPHER_KEY_LENGTH) return null;

  let iv = random(constants.CIPHER_IV_LENGTH);

  return Buffer.concat([iv, encrypt(key, iv, data)]);
}

export function decryptIV(key: Buffer, ciphertext: Buffer): Buffer {
  if (!Buffer.isBuffer(key) || key.length !== constants.CIPHER_KEY_LENGTH) return null;

  let iv = ciphertext.slice(0, constants.CIPHER_IV_LENGTH);
  let data = ciphertext.slice(constants.CIPHER_IV_LENGTH);

  return decrypt(key, iv, data);
}
