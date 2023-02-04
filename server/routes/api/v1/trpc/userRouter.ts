import { schema, UserController } from "../../../../controllers/UserController";
import { procedure, router } from "../../../../trpc";

export const user = (routes: typeof router) =>
  routes({
    get: procedure.query(UserController.get),
    settings: procedure
      .input(schema.update_settings)
      .mutation(UserController.updateSettings),
  });
