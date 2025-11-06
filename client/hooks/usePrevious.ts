import { useDispatch } from "react-redux";

import { ClientSocketEvent } from "@common/SocketClientEvent";
import { SenderType } from "@common/CommonEvent";
import { app_state } from "@client/state/AppState";
import { previous } from "@reducers/player";

export const usePrevious = () => {
  const dispatch = useDispatch();

  return () => {
    const { outgoing_connection, ws } = app_state;

    if (!outgoing_connection.value) {
      return dispatch(previous({}));
    }

    return ws.emit(ClientSocketEvent.PlayerPrevious, {
      sender: SenderType.Source,
    });
  };
};
