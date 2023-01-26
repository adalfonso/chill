import {
  MediaFileController,
  schema,
} from "../../../../controllers/MediaFileController.mjs";
import { procedure, router } from "../../../../trpc.mjs";

export const media = (routes: typeof router) =>
  routes({
    scan: procedure.mutation(MediaFileController.scan),
    search: procedure.input(schema.search).query(MediaFileController.search),
    query: procedure.input(schema.query).query(MediaFileController.query),
  });
