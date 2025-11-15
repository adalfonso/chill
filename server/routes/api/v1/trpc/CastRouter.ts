import { CastController } from "@server/controllers/CastController";
import { procedure, router } from "@server/trpc";

export const CastRouter = (routes: typeof router) =>
  routes({
    getCastId: procedure.query(CastController.getCastId),
    getAppClients: procedure.query(CastController.getAppClients),
  });
