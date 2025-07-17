import { MediaFileController, schema } from "@controllers/MediaFileController";
import { procedure, router } from "@server/trpc";

export const MediaRouter = (routes: typeof router) =>
  routes({
    scan: procedure.mutation(MediaFileController.scan),
    search: procedure.input(schema.search).query(MediaFileController.search),
    byFileType: procedure.query(MediaFileController.byFileType),
  });
