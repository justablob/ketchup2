///////////////////////////////////////////
//                                       //
//   Ketchup2 Authentication Mechanism   //
//                                       //
///////////////////////////////////////////

import * as constants from "./constants";

import Client from "./client";
import Server from "./server";

import * as Helper from "./helper";

export default {
  version: constants.VERSION,
  Client,
  Server,
  Helper,
}