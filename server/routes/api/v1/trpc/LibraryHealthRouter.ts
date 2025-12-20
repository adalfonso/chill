import { LibraryHealthController } from "@server/controllers/LibraryHealthController";
import { procedure, router } from "@server/trpc";

export const LibraryHealthRouter = (routes: typeof router) =>
  routes({
    ambiguousArtistGenre: procedure.query(
      LibraryHealthController.ambiguousArtistGenre,
    ),
    libraryCounts: procedure.query(LibraryHealthController.libraryCounts),
    librarySize: procedure.query(LibraryHealthController.librarySize),
    lowQualityAlbums: procedure.query(LibraryHealthController.lowQualityAlbums),
  });
