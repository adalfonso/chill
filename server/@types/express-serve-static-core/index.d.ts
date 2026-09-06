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
      // Sourced from the zod-only leaf module, not `@server/lib/Token`:
      // referencing Token here pulls `@server/init` (express + passport)
      // into a load cycle that flips the `Request.user` declaration merge
      // in @types/passport's favour. Inline `import(...)` keeps this file a
      // global augmentation rather than a module.
      _user: import("@server/lib/auth/tokenPayloads").AccessTokenPayload;
      app: Express.Application;
    }
  }
}
