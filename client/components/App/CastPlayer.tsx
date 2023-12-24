import "./Toolbar.scss";
import { Nullable } from "@common/types";
import { client } from "@client/client";
import { getState } from "@client/state/reducers/store";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useRef } from "react";
import {
  next,
  pause,
  play,
  seek,
  setPlayerIsCasting,
} from "@client/state/reducers/player";

export const CastPlayer = () => {
  const { caster, player } = useSelector(getState);
  const context = useRef<Nullable<cast.framework.CastContext>>(null);
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
      const { _id, _index } = media.metadata;

      if ([_id, _index].includes(undefined)) {
        return;
      }

      const track_has_changed = _index - 1 === player.index;

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
  }, [player.index, player.is_casting]);

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
            ? await client.media.castInfo.query({
                media_ids: playlist.map((file) => file._id),
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
            dispatch(play({ files: playlist, cast_info, index, progress }));
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
