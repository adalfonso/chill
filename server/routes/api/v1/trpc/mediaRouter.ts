import {
  MediaFileController,
  schema,
} from "../../../../controllers/MediaFileController";
import { procedure, router } from "../../../../trpc";

export const media = (routes: typeof router) =>
  routes({
    scan: procedure.mutation(MediaFileController.scan),
    search: procedure.input(schema.search).query(MediaFileController.search),
    query: procedure.input(schema.query).query(MediaFileController.query),
    query_as_group: procedure
      .input(schema.query_as_group)
      .query(MediaFileController.queryAsGroup),
  });
