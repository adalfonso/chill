import { MediaFileController, schema } from "@controllers/MediaFileController";
import { procedure, router } from "@server/trpc";

export const media = (routes: typeof router) =>
  routes({
    castInfo: procedure
      .input(schema.cast_info)
      .query(MediaFileController.castInfo),
    scan: procedure.mutation(MediaFileController.scan),
    search: procedure.input(schema.search).query(MediaFileController.search),
    query: procedure.input(schema.query).query(MediaFileController.query),
    queryRandom: procedure
      .input(schema.queryRandom)
      .mutation(MediaFileController.queryRandom),
    query_as_group: procedure
      .input(schema.query_as_group)
      .query(MediaFileController.queryAsGroup),
  });
