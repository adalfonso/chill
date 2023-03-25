import { User as UserModel } from "@common/models/User";

declare global {
  namespace Express {
    interface Request {
      user?: UserModel;
    }
  }
}
