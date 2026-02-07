import { MediaFileController, schema } from "@controllers/MediaFileController";
import { admin_procedure, procedure, router } from "@server/trpc";

export const MediaRouter = (routes: typeof router) =>
  routes({
    scan: admin_procedure.mutation(MediaFileController.scan),
    search: procedure.input(schema.search).query(MediaFileController.search),
    byFileType: procedure.query(MediaFileController.byFileType),
  });
