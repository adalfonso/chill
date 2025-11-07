import { useDispatch } from "react-redux";

import { ClientSocketEvent } from "@common/SocketClientEvent";
import { SenderType } from "@common/CommonEvent";
import { getAppState } from "@client/state/AppState";
import { next } from "@reducers/player";

export const useNext = () => {
  const dispatch = useDispatch();

  return (payload: { auto?: boolean }) => {
    const { outgoing_connection, incoming_connections, ws } = getAppState();

    const is_target = incoming_connections.value.length > 0;
    const is_source = Boolean(outgoing_connection.value);

    if (is_source || is_target) {
      ws.emit(ClientSocketEvent.PlayerNext, {
        payload,
        sender: is_target ? SenderType.Target : SenderType.Source,
      });
    }

    if (!is_source) {
      dispatch(next(payload));
    }
  };
};
