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
    console.log("PreStored", clientCredentials.length);
    let serverCredentials = ketchup.Helper.ServerCreatePassword(clientCredentials);
    console.log("Stored", serverCredentials[2].length);

    let clientAD = crypto.random(32);
    let serverAD = crypto.random(32);

    client.SetCredentials(username, password, location);

    let clientFirst = client.ClientFirst(clientAD);
    console.log("ClientFirst", clientFirst.length);
    assert(server.ClientFirst(clientFirst, clientAD));

    if (server.username === username) server.SetStored(serverCredentials[2]);

    let serverFirst = server.ServerFirst(serverAD);
    console.log("ServerFirst", serverFirst.length);
    assert(client.ServerFirst(serverFirst, serverAD));

    let clientLast = client.ClientLast();
    console.log("ClientLast", clientLast.length);
    assert(server.ClientLast(clientLast));

    let serverLast = server.ServerLast();
    console.log("ServerLast", serverLast.length);
    assert(client.ServerLast(serverLast));

    let clientSharedKey = client.GetSharedKey();
    let serverSharedKey = server.GetSharedKey();

    assert.equal(Buffer.compare(clientSharedKey, serverSharedKey), 0);
  });
});