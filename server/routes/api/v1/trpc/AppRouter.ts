import { AppController } from "@controllers/AppController";
import { procedure, router } from "@server/trpc";

export const AppRouter = (routes: typeof router) =>
  routes({
    getCastId: procedure.query(AppController.getCastId),
  });
