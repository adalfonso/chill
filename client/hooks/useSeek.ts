import { useDispatch } from "react-redux";

import { getAppState } from "@client/state/AppState";
import { SenderType } from "@common/CommonEvent";
import { ClientSocketEvent } from "@common/SocketClientEvent";
import { seek } from "@reducers/player";
import { useRef } from "preact/hooks";

export const useSeek = () => {
  const dispatch = useDispatch();
  const lastEmit = useRef(0);

  return (percent: number) => {
    const { outgoing_connection, ws } = getAppState();

    const is_source = Boolean(outgoing_connection.value);

    const now = performance.now();
    // throttle source to ~20 fps
    if (is_source && now - lastEmit.current < 50) {
      return;
    }

    lastEmit.current = now;

    if (!is_source) {
      dispatch(seek(percent));
    }

    if (is_source) {
      return ws.emit(ClientSocketEvent.PlayerSeek, {
        payload: percent,
        sender: SenderType.Source,
      });
    }
  };
};
