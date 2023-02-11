import * as trpcExpress from "@trpc/server/adapters/express";
import superjson from "superjson";
import { admin } from "@routes/api/v1/trpc/adminRouter";
import { inferAsyncReturnType, initTRPC, TRPCError } from "@trpc/server";
import { media } from "@routes/api/v1/trpc/mediaRouter";
import { playlist } from "@routes/api/v1/trpc/playlistRouter";
import { user } from "@routes/api/v1/trpc/userRouter";
import { z, ZodType } from "zod";

export const createContext = ({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions) => ({ req, res });

type Context = inferAsyncReturnType<typeof createContext>;

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const { router, middleware, procedure } = t;

const isAdmin = middleware(async ({ ctx: { req }, next }) => {
  const { user } = req;

  // TODO: fix hack
  if (!user || (user as any).type !== "admin") {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next();
});

export const admin_procedure = procedure.use(isAdmin);

// Initialize the tRPC router
export const api_router = t.router({
  admin: admin(router),
  media: media(router),
  playlist: playlist(router),
  user: user(router),
});

export type ApiRouter = typeof api_router;

const empty = z.undefined();

export type Request<T extends ZodType = typeof empty> = {
  input: z.infer<T>;
  ctx: Context;
};
