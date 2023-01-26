import { admin_procedure, router } from "../../../../trpc.mjs";
import {
  InviteController,
  schema,
} from "../../../../controllers/InviteController.mjs";

export const admin = (routes: typeof router) =>
  routes({
    invite_user: admin_procedure
      .input(schema.invite)
      .mutation(InviteController.create),
  });
