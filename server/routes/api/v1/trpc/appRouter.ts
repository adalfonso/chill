import { AppController } from "@controllers/AppController";
import { procedure, router } from "@server/trpc";

export const app = (routes: typeof router) =>
  routes({
    getCastId: procedure.query(AppController.getCastId),
  });
