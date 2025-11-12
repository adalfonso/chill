import * as cookie from "cookie";
import { Server } from "node:http";

import { verifyAndDecodeJwt } from "../Token";
import { SocketServer } from "./SocketServer";
import { ClientSocketData, ClientSocketEvent } from "@common/SocketClientEvent";
import { ServerSocketData, ServerSocketEvent } from "@common/SocketServerEvent";

export const upgradeServer = (
  http_server: Server,
  socket_server: SocketServer<
    ClientSocketEvent,
    ClientSocketData,
    ServerSocketEvent,
    ServerSocketData
  >,
) => {
  http_server.on("upgrade", async (req, socket, head) => {
    socket.on("error", console.error);

    const { access_token } = cookie.parse(req.headers.cookie || "");

    if (!access_token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    socket.removeListener("error", console.error);

    try {
      Object.assign(req, { _user: await verifyAndDecodeJwt(access_token) });
    } catch (err) {
      console.error("JWT verification failed:", err);
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    socket_server.wss.handleUpgrade(req, socket, head, (ws) => {
      socket_server.wss.emit("connection", ws, req);
    });
  });
};
