import { User as UserType, UserSettings } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: UserType & { settings: Partial<UserSettings> | null };
    }
  }
}
