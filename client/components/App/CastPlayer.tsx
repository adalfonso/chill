import "./Toolbar.scss";
import { getState } from "@client/state/reducers/store";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useRef } from "react";
import { Nullable } from "@common/types";
import { toggleCasting } from "@client/state/reducers/caster";

export const CastPlayer = () => {
  const { caster } = useSelector(getState);
  const context = useRef<Nullable<cast.framework.CastContext>>(null);

  const dispatch = useDispatch();

  useEffect(() => {
    if (!caster.ready || caster.app_id === null) {
      return;
    }

    const ctx = cast.framework.CastContext.getInstance();

    ctx.setOptions({
      receiverApplicationId: caster.app_id,
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
    });

    ctx.addEventListener(
      cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
      (event: cast.framework.SessionStateEventData) => {
        const { sessionState } = event;
        const active_states = ["SESSION_STARTED", "SESSION_RESUMED"];

        if (active_states.includes(sessionState)) {
          dispatch(toggleCasting({ active: true }));
        } else if (sessionState === "SESSION_ENDED") {
          dispatch(toggleCasting({ active: false }));
        }
      },
    );

    context.current = ctx;
  }, [caster.ready]);
  return <div id="cast-player"></div>;
};
