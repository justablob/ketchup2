## !!! BIGASS DISCLAIMER !!!
***TLDR; I'm deprecating Ketchup2 before it was even properly released.***
<br>
**There are proofs out there that prove that it is impossible to build a secure password-based key exchange like this one without public-key cryptography. Ketchup2, like many other "aPAKE"s is very vulnerable to offline dictionary attacks. While this wouldn't be an issue if users used strong passwords and changed them for every website, in practice, this isn't done often. A credential stuffing attack can potentially break Ketchup2 in a few hours. PLEASE don't use it for password-based authentication. I'll be working on another mechanism intended for securely generated credentials (like API keys) that will use part of the foundation from Ketchup2. I learned a lot while programming this but I'd rather leave it to real professionals now. Check out OPAQUE, a new aPAKE using OPRFs, basically elliptic curves where the keyholder doesn't see the input or the output. Really interesting new concept, I don't understand it well enough yet to write an implementation.**

```

DISCLAIMER 1: KETCHUP2 WAS NOT PEER-REVIEWED. DO NOT USE FOR ANY PROJECTS UNDER ANY CIRCUMSTANCES. YOU WILL MOST LIKELY REGRET IT.
DISCLAIMER 2: I'VE NEVER RELEASED A CRYPTOGRAPHIC PROTOCOL BEFORE, AND I HAVEN'T WRITTEN DOCUMENTATION FOR ONE EITHER.
DISCLAIMER 3: THIS COULD VERY WELL BE TERRIBLE, PLEASE DON'T LAUGH AT ME IF I MESSED UP BAD. YOU CAN HELP ME OUT BY OPENING AN ISSUE.

╔═══════════════════════════════════════════╗
║                                           ║
║     Ketchup2 Authentication Mechanism     ║
║                                           ║
╚═══════════════════════════════════════════╝

Ketchup2, named by me and a friend during lunch, is a password-based mutual authentication mechanism. It aims to avoid transmitting the plaintext password over the network, authenticate both sides to each other and offer a way to verify additional data.
Below is a likely lacking documentation of it, hope it's understandable enough. The code in this repository is a Typescript/NodeJS implementation of it. Tested and working on NodeJS 15.4.0, though it should work with lower versions too.

~~~~ Algorithms ~~~~

  ChaCha20-Poly1305 - Authenticated cipher, used to encrypt stored tokens.
  BLAKE2b512        - Hash function, used for all hashing (except passwords) and key derivation throughout the project.
  Scrypt            - Slow password hash, used to hash passwords.
                      Parameters: N = 2 ** 16, r = 16, p = 1

Data is encoded in the MessagePack format.

~~~~ Flow ~~~~

<- ClientFirst
    $Username ::
        Username encoded as UTF8.

    $Location? ::
        Log in location, think Realm in other protocols. If logging in at "example.com" over HTTPS, location could be "https:example.com".
        This is optional, and the format does not have to follow any standard, as long as it stays the same.

    ClientRandomness ::
        24 random bytes from the client.

    ClientChallenge ::
        32 random bytes used as challenge, that the server will use to authenticate itself.

-- Client
    ClientAdditionalData? ::
        Optional data that should be taken into the hash.
        Both sides need to know this value, but it should not be transmitted as part of Ketchup.
        Example: Client and Server do Diffie-Hellman in addition to Ketchup to establish a secure channel.
        The Client's DH public key could be used as a value for this, because it will allow the server to
        verify that there's no man in the middle, because an attacker is not able to fake the necessary signature.
        Defaults to an empty buffer.

-> ServerFirst
    ServerRandomness ::
        24 random bytes from the server.

    ServerChallenge ::
        32 random bytes used as challenge, that the client will use to authenticate itself.

    ClientInternalSeed ::
        Seed the client uses.

    ServerInternalSeed ::
        Seed the server uses.

    UserSeed ::
        Seed used in calculation of PartialKey.

    Salt ::
        Salt used for password hashing.

-- Server
    ServerAdditionalData? ::
        Same as ClientAdditionalData, but for the server.

-- Client
    StoredPassword :: Scrypt($Password, ServerFirst.Salt, 64)
        Hashed+Salted password.

    ClientKey :: HKDF(ServerFirst.ClientInternalSeed, Client.StoredPassword, 64, "ClientKey")
        Used internally to calculate ServerKey.

    ServerKey :: HMAC(ServerFirst.ServerInternalSeed, Client.ClientKey)
        Used internally to sign challenges. The server stores this in an encrypted form.

    SharedKey? :: HMAC(Client.ServerKey, HMAC($UnmixedSharedKey, ClientFirst.ClientRandomness | ServerFirst.ServerRandomness))
        Shared key, can be optionally used to secure further communication.

<- ClientLast
    PartialKey :: HKDF(ServerFirst.UserSeed, Client.StoredPassword, 64, "PartialKeyClient")
        Key used to decrypt the password hash on the server.

    ClientResponse :: HKDF(Client.ServerKey, ServerFirst.ServerChallenge | ClientFirst.ClientRandomness | ServerFirst.ServerRandomness | Client.ClientAdditionalData, 64, "ClientResponse")
        Client response for servers challenge.

-- Server
    StoredToken ::
        Encrypted password hash, retrieved from database.

    ServerPartialKeySeed ::
        Random bytes retrieved from database, used to hash PartialKey.

    ServerPartialKey :: HKDF(Server.ServerPartialKeySeed, ClientLast.PartialKey, 32, "PartialKey")
        Key used to decrypt StoredToken into ServerKey.

    ServerKey :: Decrypt(Server.ServerPartialKey, Server.StoredToken)
        Equal to Client.ServerKey.

    SharedKey? :: HMAC(Server.ServerKey, HMAC($UnmixedSharedKey, ClientFirst.ClientRandomness | ServerFirst.ServerRandomness))
        Shared key, can be optionally used to secure further communication.

-> ServerLast
    ServerResponse :: HKDF(Server.ServerKey, ClientFirst.ClientChallenge | ServerFirst.ServerRandomness | ClientFirst.ClientRandomness | Server.ServerAdditionalData, 64, "ServerResponse")
        Server response for clients challenge.

// At this point, both sides have enough information to validate each others responses, without having disclosed enough
   information to allow a possible man in the middle steal any sensitive data or impersonate the user, given the man in
   the middle does not have access to the server database, or otherwise infiltrated one of the two sides. The optionally
   shared key can be used to secure further communications between the two sides.

~~~~ Functions ~~~~

x | y - concatenation of x and y

Scrypt(password, salt, length = 64) - Scrypt KDF over password using salt with output length.
Hash(data) - BLAKE2b512 over data
HMAC(key, data) - BLAKE2b512 keyed HMAC over data
HKDF(key, data, length = 64, info) - HKDF-BLAKE2b512 over key, data, info with output length.
Decrypt(key, data) - Decrypts data using chacha20-poly1305 using key as key and the first 12 bytes of data as IV.
Encrypt(key, data) - Encrypts data using chacha20-poly1305 using key as key and generating a random IV.

~~~~ Symbols and Terminology ~~~~

Seed = Salt, because I mixed them up while writing this

// : Annotation
-- : Value used locally
<- : Client to Server
-> : Server to Client

```