import { authed_procedure, router } from "@server/trpc";
import {
  LoginSessionController,
  schema,
} from "@controllers/LoginSessionController";

export const LoginSessionRouter = (routes: typeof router) =>
  routes({
    list: authed_procedure.query(LoginSessionController.list),
    revoke: authed_procedure
      .input(schema.revoke)
      .mutation(LoginSessionController.revoke),
    revokeOthers: authed_procedure.mutation(
      LoginSessionController.revokeOthers,
    ),
  });
