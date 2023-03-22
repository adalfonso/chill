import "./Toolbar.scss";
import { Nullable } from "@common/types";
import { client } from "@client/client";
import { getState } from "@client/state/reducers/store";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useRef } from "react";
import {
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
    if (!caster.ready || caster.app_id === null) {
      return;
    }

    const ctx = cast.framework.CastContext.getInstance();
    const SESSION_CHANGED =
      cast.framework.CastContextEventType.SESSION_STATE_CHANGED;

    const onSessionChanged = async (
      event: cast.framework.SessionStateEventData,
    ) => {
      const { sessionState } = event;
      const active_states = ["SESSION_STARTED", "SESSION_RESUMED"];
      const { progress, playlist, index } = player_ref.current;

      if (active_states.includes(sessionState)) {
        const cast_info = playlist.length
          ? await client.media.castInfo.query({
              media_ids: playlist.map((file) => file._id),
            })
          : null;

        // Pause currently playing HTML Audio
        dispatch(pause());
        dispatch(setPlayerIsCasting(true));
        dispatch(play({ files: playlist, cast_info, index, progress }));
      } else if (sessionState === "SESSION_ENDED") {
        dispatch(setPlayerIsCasting(false));
        dispatch(seek(progress));
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
