import { useDispatch, useSelector } from "react-redux";
import { useEffect, useRef } from "react";

import "./Toolbar.scss";
import { Maybe } from "@common/types";
import { api } from "@client/client";
import { getState } from "@client/state/reducers/store";

import {
  next,
  pause,
  play,
  seek,
  setPlayerIsCasting,
} from "@client/state/reducers/player";

export const CastPlayer = () => {
  const { caster, player } = useSelector(getState);
  const context = useRef<Maybe<cast.framework.CastContext>>(null);
  const player_ref = useRef(player);

  const dispatch = useDispatch();
  player_ref.current = player;

  useEffect(() => {
    if (!player.is_casting) {
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
      const { now_playing } = player;

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
        dispatch(next({ auto: true }));
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
    player.now_playing,
    player.is_casting,
    player.playlist.length,
    context.current, // is this needed
    context.current?.getCurrentSession()?.getSessionId(),
  ]);

  useEffect(() => {
    if (!caster.ready || caster.app_id === null) {
      return;
    }

    const ctx = cast.framework.CastContext.getInstance();
    const SESSION_CHANGED =
      cast.framework.CastContextEventType.SESSION_STATE_CHANGED;

    const onSessionChanged = async (
      event: cast.framework.SessionStateEventData,
    ) => {
      const { progress, playlist, index } = player_ref.current;

      switch (event.sessionState) {
        case cast.framework.SessionState.SESSION_RESUMED:
        case cast.framework.SessionState.SESSION_STARTED:
          const cast_info = playlist.length
            ? await api.track.castInfo.query({
                track_ids: playlist.map((track) => track.id),
              })
            : null;

          // Pause currently playing HTML Audio
          dispatch(pause());
          dispatch(setPlayerIsCasting(true));

          if (
            event.sessionState ===
              cast.framework.SessionState.SESSION_STARTED &&
            playlist.length
          ) {
            // Immediately play when starting a cast session
            dispatch(play({ tracks: playlist, cast_info, index, progress }));
          }

          break;

        case cast.framework.SessionState.SESSION_ENDED:
          dispatch(setPlayerIsCasting(false));
          dispatch(seek(progress));
          break;

        default:
          break;
      }
    };

    ctx.setOptions({
      receiverApplicationId: caster.app_id,
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
    });

    ctx.addEventListener(SESSION_CHANGED, onSessionChanged);

    context.current = ctx;

    return () => ctx.removeEventListener(SESSION_CHANGED, onSessionChanged);
  }, [caster.ready]);

  return <div id="cast-player"></div>;
};
