import { InviteController, schema } from "@controllers/InviteController";
import { admin_procedure, router } from "@server/trpc";

export const admin = (routes: typeof router) =>
  routes({
    invite_user: admin_procedure
      .input(schema.invite)
      .mutation(InviteController.create),
  });
