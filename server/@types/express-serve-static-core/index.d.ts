import { User as UserType, UserSettings } from "@prisma/client";

declare global {
  namespace Express {
    interface Application {
      _wss: SocketServer<
        ClientSocketEvent,
        ClientSocketData,
        ServerSocketEvent,
        ServerSocketData
      >;
    }

    interface Request {
      user?: UserType & { settings: Partial<UserSettings> | null };
      _user: AccessTokenPayload;
      app: Express.Application;
    }
  }
}
