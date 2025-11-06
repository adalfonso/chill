import { useDispatch } from "react-redux";

import { ClientSocketEvent } from "@common/SocketClientEvent";
import { SenderType } from "@common/CommonEvent";
import { app_state } from "@client/state/AppState";
import { next } from "@reducers/player";

export const useNext = () => {
  const dispatch = useDispatch();

  return (payload: { auto?: boolean }) => {
    const { outgoing_connection, ws } = app_state;

    if (!outgoing_connection.value) {
      return dispatch(next(payload));
    }

    return ws.emit(ClientSocketEvent.PlayerNext, {
      payload,
      sender: SenderType.Source,
    });
  };
};
