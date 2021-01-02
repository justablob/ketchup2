import "mocha";
import { assert } from "chai";

import ketchup from "../src";
import * as crypto from "../src/crypto";

describe("Ketchup2", () => {
  it("correct username / correct password / correct location", () => {
    let client = new ketchup.Client(),
        server = new ketchup.Server();

    let username = crypto.random(8).toString("hex"),
        password = crypto.random(16).toString("hex"),
        location = crypto.random(8).toString("hex");

    let clientCredentials = ketchup.Helper.ClientCreatePassword(username, password, location),
        serverCredentials = ketchup.Helper.ServerCreatePassword(clientCredentials);

    let clientAD = crypto.random(32),
        serverAD = crypto.random(32);

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
  });
});