import {
  schema,
  UserController,
} from "../../../../controllers/UserController.mjs";
import { procedure, router } from "../../../../trpc.mjs";

export const user = (routes: typeof router) =>
  routes({
    get: procedure.query(UserController.get),
    settings: procedure
      .input(schema.update_settings)
      .mutation(UserController.updateSettings),
  });
