import { admin_procedure, router } from "@server/trpc";

import { InviteController, schema } from "@controllers/InviteController";

export const AdminRouter = (routes: typeof router) =>
  routes({
    invite_user: admin_procedure
      .input(schema.invite)
      .mutation(InviteController.create),
  });
