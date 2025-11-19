import { LibraryHealthController } from "@server/controllers/LibraryHealthController";
import { procedure, router } from "@server/trpc";

export const LibraryHealthRouter = (routes: typeof router) =>
  routes({
    ambiguousArtistGenre: procedure.query(
      LibraryHealthController.ambiguousArtistGenre,
    ),
    libraryStats: procedure.query(LibraryHealthController.libraryStats),
    lowQualityAlbums: procedure.query(LibraryHealthController.lowQualityAlbums),
  });
