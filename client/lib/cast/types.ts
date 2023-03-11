import { ArrayElement } from "@common/types";
import { Media } from "@common/models/Media";
import { client } from "@client/client";

export type PreCastPayload = Awaited<
  ReturnType<typeof client.media.castInfo.query>
>;

export type CastPayload = (ArrayElement<PreCastPayload> & { meta: Media })[];
