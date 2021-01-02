import "mocha";
import { assert } from "chai";

import ketchup from "../src";
import * as crypto from "../src/crypto";

describe("Ketchup2", () => {
  it("correct username, correct password, correct location", () => {
    let client = new ketchup.Client();
    let server = new ketchup.Server();

    let username = crypto.random(8).toString("hex");
    let password = crypto.random(16).toString("hex");
    let location = crypto.random(8).toString("hex");

    let clientCredentials = ketchup.Helper.ClientCreatePassword(username, password, location);
    let serverCredentials = ketchup.Helper.ServerCreatePassword(clientCredentials);

    let clientAD = crypto.random(32);
    let serverAD = crypto.random(32);

    client.SetCredentials(username, password, location);

    let clientFirst = client.ClientFirst(clientAD);
    assert(server.ClientFirst(clientFirst, clientAD));

    if (server.username === username) server.SetStored(serverCredentials[2]);

    let serverFirst = server.ServerFirst(serverAD);
    assert(client.ServerFirst(serverFirst, serverAD));

    let clientLast = client.ClientLast();
    assert(server.ClientLast(clientLast));

    let serverLast = server.ServerLast();
    assert(client.ServerLast(serverLast));

    let clientSharedKey = client.GetSharedKey();
    let serverSharedKey = server.GetSharedKey();

    assert.equal(Buffer.compare(clientSharedKey, serverSharedKey), 0);
  });
});