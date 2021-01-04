export * as ClientFirst from "./ClientFirst";
export * as ServerFirst from "./ServerFirst";
export * as ClientLast from "./ClientLast";
export * as ServerLast from "./ServerLast";
export * as PreStored from "./PreStored";
export * as Stored from "./Stored";

export function wrapConditional <T, Ts, R> (condition: boolean, func: (arg: T, ...args: Ts[]) => R, arg: T, ...args: Ts[]): R | T {
  if (condition) {
    return func(arg, ...args);
  } else {
    return arg;
  }
}

export enum Identifiers {
  ClientFirst = 0x00,
  ServerFirst = 0x01,
  ClientLast = 0x02,
  ServerLast = 0x03,
  PreStored = 0x04,
  Stored = 0x05,
}