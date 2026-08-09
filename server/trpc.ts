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
import { LoginSessionRouter } from "./routes/api/v1/trpc/LoginSessionRouter";
import { db } from "@server/lib/data/db";
import { AccessTokenPayload } from "@server/lib/Token";

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

// Admin privilege is read from the database at the point of use rather than
// trusted from `req.user` (itself already a fresh per-request lookup, but
// this keeps the check self-contained and independent of that other
// middleware layer's behavior) or, worse, a token claim -- a demotion must
// take effect on the very next request, not after up to
// ACCESS_TOKEN_TTL_SECONDS (ADR-0009 KTD16, R16).
const isAdmin = middleware(async ({ ctx: { req }, next }) => {
  const user = await db.user.findUnique({
    where: { id: req._user.id },
    select: { type: true },
  });

  if (user?.type !== UserType.Admin) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next();
});

export const admin_procedure = procedure.use(isAdmin);

// Narrows the token payload into context, so a route can take the caller's
// identity from `ctx.token` and never from client-supplied input (ADR-0009
// U6/U9 -- LoginSessionRouter's revoke/revokeOthers depend on this to avoid
// letting a caller name an arbitrary user id).
const isAuthed = middleware(async ({ ctx, next }) => {
  return next({ ctx: { ...ctx, token: ctx.req._user } });
});

export const authed_procedure = procedure.use(isAuthed);

// Initialize the tRPC router
export const api_router = t.router({
  admin: AdminRouter(router),
  album: AlbumRouter(router),
  artist: ArtistRouter(router),
  cast: CastRouter(router),
  compilation: CompilationRouter(router),
  genre: GenreRouter(router),
  libraryHealth: LibraryHealthRouter(router),
  loginSession: LoginSessionRouter(router),
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

export type AuthedRequest<T extends ZodType = z.ZodUndefined> = {
  input: z.infer<T>;
  ctx: Context & { token: AccessTokenPayload };
};
