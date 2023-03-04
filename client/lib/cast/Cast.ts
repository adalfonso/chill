import { CastMedia, CastSdk } from "./CastSdk";
import { CastPayload } from "./types";

/**
 * Play media files from a payload
 *
 * @param payload - playlist items
 */
export const play = async (payload: CastPayload, index = 0) => {
  const session = cast.framework.CastContext.getInstance().getCurrentSession();

  if (session === null) {
    return console.warn("Can't play audio because there is no cast session.");
  }

  const tracks = payload.map(CastSdk.Media);
  const track = tracks.splice(index, 1)[0];
  const previous = tracks.splice(0, index);
  const next = tracks;

  // Load the first track, then queue any others
  session.loadMedia(CastSdk.Request(track)).then(
    () => {
      console.info("Load media request succeeded");

      if (previous.length + next.length === 0) {
        return;
      }

      queue(previous, next);
    },
    (errorCode) => console.error("Load media request failed: " + errorCode),
  );
};

/**
 * Queue tracks on the current media session
 *
 * @param next - tracks to queue
 */
const queue = (previous: CastMedia[], next: CastMedia[]) => {
  console.info("Queueing additional tracks");
  const session = cast.framework.CastContext.getInstance().getCurrentSession();

  if (session === null) {
    return console.warn("Can't queue tracks because there is no cast session.");
  }

  if (previous.length) {
    const loadRequest = new chrome.cast.media.QueueInsertItemsRequest(
      previous.map((track) => new chrome.cast.media.QueueItem(track)),
    );

    loadRequest.insertBefore = 0;

    session.getMediaSession()?.queueInsertItems(
      loadRequest,
      () => console.info(`Successfully queued ${next.length} tracks`),
      (errorCode) => console.error("Queueing tracks failed: " + errorCode),
    );
  }

  if (next.length) {
    const loadRequest = new chrome.cast.media.QueueInsertItemsRequest(
      next.map((track) => new chrome.cast.media.QueueItem(track)),
    );

    session.getMediaSession()?.queueInsertItems(
      loadRequest,
      () => console.info(`Successfully queued ${next.length} tracks`),
      (errorCode) => console.error("Queueing tracks failed: " + errorCode),
    );
  }
};
