import { ArrayElement, PlayableTrackWithIndex } from "@common/types";
import { api } from "@client/client";

export type PreCastPayload = Awaited<
  ReturnType<typeof api.track.castInfo.query>
>;

export type CastPayload = (ArrayElement<PreCastPayload> & {
  meta: PlayableTrackWithIndex;
})[];
