import { ArrayElement } from "@common/types";
import { client } from "@client/client";
import { IndexedMedia } from "@common/models/Media";

export type PreCastPayload = Awaited<
  ReturnType<typeof client.media.castInfo.query>
>;

export type CastPayload = (ArrayElement<PreCastPayload> & {
  meta: IndexedMedia;
})[];
