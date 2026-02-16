import { useEffect, useRef } from "preact/hooks";

import * as caster from "@client/state/casterStore";
import * as player from "@client/state/playerStore";
import { Maybe } from "@common/types";
import { api } from "@client/client";
import { useAppState, usePlay, useSeek } from "@hooks/index";

export const CastPlayer = () => {
  const { progress } = useAppState();

  const cast_context = useRef<Maybe<cast.framework.CastContext>>(null);
  const play = usePlay();
  const seek = useSeek();

  useEffect(() => {
    if (!player.is_casting.value) {
      return;
    }

    const remotePlayerController = new cast.framework.RemotePlayerController(
      new cast.framework.RemotePlayer(),
    );

    const monitorTrackChange = (
      event: cast.framework.RemotePlayerChangedEvent,
    ) => {
      // In case media info is not available
      if (!event.value) {
        return;
      }

      const media = event.value as chrome.cast.media.MediaInfo;
      const { _index: cast_index } = media.metadata;
      const now_playing = player.now_playing.value;

      if (cast_index === undefined) {
        return;
      }

      if (!now_playing) {
        console.error(
          `Media info changed but there is no now playing. Is this possible, not sure?`,
        );

        return;
      }

      const current_index = now_playing._index;
      const track_has_changed = cast_index > current_index;

      if (track_has_changed) {
        player.next({ auto: true });
      }
    };

    remotePlayerController.addEventListener(
      cast.framework.RemotePlayerEventType.MEDIA_INFO_CHANGED,
      monitorTrackChange,
    );

    return () => {
      remotePlayerController.removeEventListener(
        cast.framework.RemotePlayerEventType.MEDIA_INFO_CHANGED,
        monitorTrackChange,
      );
    };
  }, [
    player.now_playing.value,
    player.is_casting.value,
    player.playlist.value.length,
    cast_context.current, // is this needed
    cast_context.current?.getCurrentSession()?.getSessionId(),
  ]);

  useEffect(() => {
    if (!caster.ready.value || caster.app_id.value === null) {
      return;
    }

    const ctx = cast.framework.CastContext.getInstance();
    const SESSION_CHANGED =
      cast.framework.CastContextEventType.SESSION_STATE_CHANGED;

    const onSessionChanged = async (
      event: cast.framework.SessionStateEventData,
    ) => {
      const playlist = player.playlist.value;

      switch (event.sessionState) {
        case cast.framework.SessionState.SESSION_RESUMED:
        case cast.framework.SessionState.SESSION_STARTED: {
          const cast_info = playlist.length
            ? await api.track.castInfo.query({
                track_ids: playlist.map((track) => track.id),
              })
            : null;

          // Pause currently playing HTML Audio
          player.pause();
          player.setPlayerIsCasting(true);

          if (
            event.sessionState ===
              cast.framework.SessionState.SESSION_STARTED &&
            playlist.length
          ) {
            // Immediately play when starting a cast session
            play({
              tracks: playlist,
              cast_info,
              index: player.index.value,
              progress: progress.value,
            });
          }

          break;
        }
        case cast.framework.SessionState.SESSION_ENDED:
          player.setPlayerIsCasting(false);
          seek(progress.value);
          break;

        default:
          break;
      }
    };

    ctx.setOptions({
      receiverApplicationId: caster.app_id.value,
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
    });

    ctx.addEventListener(SESSION_CHANGED, onSessionChanged);

    cast_context.current = ctx;

    return () => ctx.removeEventListener(SESSION_CHANGED, onSessionChanged);
  }, [caster.ready.value]);

  return <div id="cast-player"></div>;
};
