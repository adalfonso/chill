import "./app.scss";
import { castDebugLogger, log_tag } from "./debug";
import type { ErrorReason } from "chromecast-caf-receiver/cast.framework.messages";

const context = cast.framework.CastReceiverContext.getInstance();
const manager = context.getPlayerManager();

manager.setMessageInterceptor(
  cast.framework.messages.MessageType.LOAD,
  (request) => {
    if (!request.media) {
      castDebugLogger.error(log_tag, "Failed to load media from request.");
      return error(cast.framework.messages.ErrorReason.INVALID_PARAMS);
    }

    request.media.entity = request.media.contentId;

    return request;
  },
);

context.start();

const error = (reason: ErrorReason) => {
  const error = new cast.framework.messages.ErrorData(
    cast.framework.messages.ErrorType.LOAD_CANCELLED,
  );

  error.reason = reason;

  return error;
};
