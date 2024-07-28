import * as trpcExpress from "@trpc/server/adapters/express";
import superjson from "superjson";
import { inferAsyncReturnType, initTRPC, TRPCError } from "@trpc/server";
import { z, ZodType } from "zod";

import { AdminRouter } from "@routes/api/v1/trpc/AdminRouter";
import { AlbumRouter } from "@routes/api/v1/trpc/AlbumRouter";
import { AppRouter } from "@routes/api/v1/trpc/AppRouter";
import { ArtistRouter } from "@routes/api/v1/trpc/ArtistRouter";
import { GenreRouter } from "@routes/api/v1/trpc/GenreRouter";
import { MediaRouter } from "@routes/api/v1/trpc/MediaRouter";
import { PlaylistRouter } from "@routes/api/v1/trpc/PlaylistRouter";
import { TrackRouter } from "./routes/api/v1/trpc/TrackRouter";
import { UserRouter } from "@routes/api/v1/trpc/UserRouter";
import { UserType } from "@prisma/client";

export const createContext = ({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions) => ({ req, res });

type Context = inferAsyncReturnType<typeof createContext>;

const t = initTRPC.context<Context>().create({ transformer: superjson });

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
  app: AppRouter(router),
  artist: ArtistRouter(router),
  genre: GenreRouter(router),
  media: MediaRouter(router),
  playlist: PlaylistRouter(router),
  track: TrackRouter(router),
  user: UserRouter(router),
});

export type ApiRouter = typeof api_router;

const empty = z.undefined();

export type Request<T extends ZodType = typeof empty> = {
  input: z.infer<T>;
  ctx: Context;
};
