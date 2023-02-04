import { procedure, router } from "@server/trpc";
import { schema, UserController } from "@controllers/UserController";

export const user = (routes: typeof router) =>
  routes({
    get: procedure.query(UserController.get),
    settings: procedure
      .input(schema.update_settings)
      .mutation(UserController.updateSettings),
  });
