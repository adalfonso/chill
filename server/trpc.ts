import * as trpcExpress from "@trpc/server/adapters/express";
import { inferAsyncReturnType, initTRPC, TRPCError } from "@trpc/server";
import { z, ZodType } from "zod";

import { AdminRouter } from "@routes/api/v1/trpc/AdminRouter";
import { AlbumRouter } from "@routes/api/v1/trpc/AlbumRouter";
import { CastRouter } from "@server/routes/api/v1/trpc/CastRouter";
import { ArtistRouter } from "@routes/api/v1/trpc/ArtistRouter";
import { GenreRouter } from "@routes/api/v1/trpc/GenreRouter";
import { MediaRouter } from "@routes/api/v1/trpc/MediaRouter";
import { PlaylistRouter } from "@routes/api/v1/trpc/PlaylistRouter";
import { TrackRouter } from "./routes/api/v1/trpc/TrackRouter";
import { UserRouter } from "@routes/api/v1/trpc/UserRouter";
import { UserType } from "@prisma/client";
import { LibraryHealthRouter } from "./routes/api/v1/trpc/LibraryHealthRouter";
import { CompilationRouter } from "./routes/api/v1/trpc/CompilationRouter";
import { SplitRouter } from "./routes/api/v1/trpc/SplitRouter";

export const createContext = ({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions) => ({
  req,
  res,
});

type Context = inferAsyncReturnType<typeof createContext>;

const t = initTRPC.context<Context>().create({});

export const { router, middleware, procedure } = t;

const isAdmin = middleware(async ({ ctx: { req }, next }) => {
  if (req?.user?.type !== UserType.Admin) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next();
});

export const admin_procedure = procedure.use(isAdmin);

// Initialize the tRPC router
export const api_router = t.router({
  admin: AdminRouter(router),
  album: AlbumRouter(router),
  artist: ArtistRouter(router),
  cast: CastRouter(router),
  compilation: CompilationRouter(router),
  genre: GenreRouter(router),
  libraryHealth: LibraryHealthRouter(router),
  media: MediaRouter(router),
  playlist: PlaylistRouter(router),
  split: SplitRouter(router),
  track: TrackRouter(router),
  user: UserRouter(router),
});

export type ApiRouter = typeof api_router;

export type Request<T extends ZodType = z.ZodUndefined> = {
  input: z.infer<T>;
  ctx: Context;
};
