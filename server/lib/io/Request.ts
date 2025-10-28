import type { Request, Express } from "express";
import { AccessTokenPayload } from "../Token";
import { ClientSocketData, ClientSocketEvent } from "@common/SocketClientEvent";
import { ServerSocketData, ServerSocketEvent } from "@common/SocketServerEvent";
import { SocketServer } from "./SocketServer";

export type TypedRequest = Request & {
  _user: AccessTokenPayload;
  app: Express & {
    _wss: SocketServer<
      ClientSocketEvent,
      ClientSocketData,
      ServerSocketEvent,
      ServerSocketData
    >;
  };
};
