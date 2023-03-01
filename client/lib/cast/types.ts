import { client } from "@client/client";

export type CastPayload = Awaited<
  ReturnType<typeof client.media.castInfo.query>
>;
export type Session = cast.framework.CastSession;
