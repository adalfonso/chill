import { admin_procedure, router } from "../../../../trpc";
import {
  InviteController,
  schema,
} from "../../../../controllers/InviteController";

export const admin = (routes: typeof router) =>
  routes({
    invite_user: admin_procedure
      .input(schema.invite)
      .mutation(InviteController.create),
  });
