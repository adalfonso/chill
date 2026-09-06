import { procedure, router } from "@server/trpc";
import {
  LoginSessionController,
  schema,
} from "@controllers/LoginSessionController";

export const LoginSessionRouter = (routes: typeof router) =>
  routes({
    list: procedure.query(LoginSessionController.list),
    revoke: procedure
      .input(schema.revoke)
      .mutation(LoginSessionController.revoke),
    revokeOthers: procedure.mutation(LoginSessionController.revokeOthers),
  });
