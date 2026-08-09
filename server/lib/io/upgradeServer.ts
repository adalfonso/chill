import * as cookie from "cookie";
import { Server } from "node:http";

import { access_token_payload_schema, verifyAndDecodeJwt } from "../Token";
import { denyList } from "../auth/DenyList";
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
      const decoded = await verifyAndDecodeJwt(
        access_token,
        access_token_payload_schema,
      );

      // The WebSocket upgrade isn't in the Express chain, so it doesn't
      // inherit isAuthenticatedApi's deny-key check -- it has to run its own.
      if (await denyList.instance().isDenied(decoded.login_session_id)) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      Object.assign(req, { _user: decoded });
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
