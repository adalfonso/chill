import { useDispatch } from "react-redux";

import { getAppState } from "@client/state/AppState";
import { SenderType } from "@common/CommonEvent";
import { ClientSocketEvent } from "@common/SocketClientEvent";
import { changeVolume } from "@reducers/player";
import { useRef } from "preact/hooks";

export const useChangeVolume = () => {
  const dispatch = useDispatch();
  const lastEmit = useRef(0);

  return (percent: number) => {
    const { outgoing_connection, incoming_connections, ws } = getAppState();

    const is_target = incoming_connections.value.length > 0;
    const is_source = Boolean(outgoing_connection.value);

    const now = performance.now();
    // throttle source to ~20 fps
    if (is_source && now - lastEmit.current < 50) {
      return;
    }

    lastEmit.current = now;

    if (!is_source) {
      dispatch(changeVolume(percent));
    }

    return ws.emit(ClientSocketEvent.PlayerChangeVolume, {
      payload: percent,
      sender: is_target ? SenderType.Target : SenderType.Source,
    });
  };
};
