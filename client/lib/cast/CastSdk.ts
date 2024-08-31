import { ArrayElement } from "@common/types";
import { CastPayload } from "./types";

export type CastMedia = chrome.cast.media.MediaInfo;
export type CastLoadRequest = chrome.cast.media.LoadRequest;

/** Extend SDK MediaInfo */
export class CastSdk {
  /**
   * Create a MediaInfo for to cast
   * @param item - media item
   */
  static Media(item: ArrayElement<CastPayload>) {
    const { url, token, meta, content_type } = item;

    const media = new chrome.cast.media.MediaInfo(
      `${url}?token=${token}`,
      content_type,
    );

    media.duration = meta.duration;
    media.metadata = new chrome.cast.media.MusicTrackMediaMetadata();

    media.metadata.title = meta.title;
    media.metadata.subtitle = meta.artist;
    media.metadata.albumArtist = meta.artist;
    media.metadata.artist = meta.artist;
    media.metadata.albumName = meta.album;
    media.metadata.releaseDate = meta.year?.toString();
    media.metadata._id = meta.id;
    media.metadata._index = meta._index;

    if (meta.album_art_filename) {
      media.metadata.images = [
        new chrome.cast.Image(
          `/cast/media/cover/${meta.album_art_filename}?size=500&token=${token}`,
        ),
      ];
    }

    return media;
  }

  /**
   * Create a cast LoadRequest with media
   *
   * @param media - media to load
   * @param current_time - offset in seconds to start playback from
   * @returns request
   */
  static Request(media: CastMedia, current_time = 0) {
    const request = new chrome.cast.media.LoadRequest(media);
    request.autoplay = true;
    request.customData = {};

    if (current_time > 0) {
      request.currentTime = current_time;
    }

    return request;
  }

  /**
   * Play media files from a payload
   *
   * @param payload - playlist items
   * @param index - track index to play first
   * @param current_time - offset in seconds to begin playback from
   */
  static Play = async (payload: CastPayload, index = 0, current_time = 0) => {
    const session =
      cast.framework.CastContext.getInstance().getCurrentSession();

    if (session === null) {
      return console.warn("Can't play audio because there is no cast session.");
    }

    const tracks = payload.map(CastSdk.Media);
    const track = tracks.splice(index, 1)[0];
    const previous = tracks.splice(0, index);
    const next = tracks;

    // Load the first track, then queue any others
    session.loadMedia(CastSdk.Request(track, current_time)).then(
      () => {
        console.info("Load media request succeeded");

        if (previous.length + next.length === 0) {
          return;
        }

        CastSdk.Queue(previous, next);
      },
      (errorCode) => console.error("Load media request failed: " + errorCode),
    );
  };

  static PlayNext = (payload: CastPayload) => {
    const tracks = payload.map(CastSdk.Media);

    const session =
      cast.framework.CastContext.getInstance().getCurrentSession();

    const loadRequest = new chrome.cast.media.QueueInsertItemsRequest(
      tracks.map((track) => new chrome.cast.media.QueueItem(track)),
    );

    const media = session?.getMediaSession();

    const [_previous, currentOrNext, next] = media?.items ?? [];

    if (!next && !currentOrNext) {
      return console.error(
        `Tried to "play next" but couldn't determine cast item to insert before`,
      );
    }

    loadRequest.insertBefore = next?.itemId ?? currentOrNext?.itemId ?? 1;

    media?.queueInsertItems(
      loadRequest,
      () =>
        console.info(
          `Successfully queued ${tracks.length} tracks to play next`,
        ),
      (errorCode) =>
        console.error("Queueing tracks to play next failed: " + errorCode),
    );
  };

  /**
   * Queue tracks on the current media session
   *
   * @param next - tracks to queue
   */
  static Queue = (previous: CastMedia[], next: CastMedia[]) => {
    const session =
      cast.framework.CastContext.getInstance().getCurrentSession();

    const media = session?.getMediaSession();

    if (session === null) {
      return console.warn(
        "Can't queue tracks because there is no cast session.",
      );
    }

    if (previous.length) {
      const loadRequest = new chrome.cast.media.QueueInsertItemsRequest(
        previous.map((track) => new chrome.cast.media.QueueItem(track)),
      );

      loadRequest.insertBefore = media?.currentItemId ?? 1;

      session.getMediaSession()?.queueInsertItems(
        loadRequest,
        () => console.info(`Successfully queued ${previous.length} tracks`),
        (errorCode) =>
          console.error(
            "Queueing tracks failed: " + JSON.stringify(errorCode, null, 2),
          ),
      );
    }

    if (next.length) {
      const loadRequest = new chrome.cast.media.QueueInsertItemsRequest(
        next.map((track) => new chrome.cast.media.QueueItem(track)),
      );

      session.getMediaSession()?.queueInsertItems(
        loadRequest,
        () => console.info(`Successfully queued ${next.length} tracks`),
        (errorCode) =>
          console.error(
            "Queueing tracks failed: " + JSON.stringify(errorCode, null, 2),
          ),
      );
    }
  };

  /** Play the currently paused track */
  static ResumePlay() {
    return new Promise((resolve, reject) => {
      cast.framework.CastContext.getInstance()
        .getCurrentSession()
        ?.getMediaSession()
        ?.play(new chrome.cast.media.PlayRequest(), resolve, () =>
          reject("Failed to play media"),
        );
    });
  }

  /** Pause the currently playing track */
  static Pause() {
    return new Promise((resolve, reject) => {
      cast.framework.CastContext.getInstance()
        .getCurrentSession()
        ?.getMediaSession()
        ?.pause(new chrome.cast.media.PauseRequest(), resolve, () =>
          reject("Failed to pause media"),
        );
    });
  }

  /** Pause the currently playing track */
  static Previous() {
    return new Promise((resolve, reject) => {
      cast.framework.CastContext.getInstance()
        .getCurrentSession()
        ?.getMediaSession()
        ?.queuePrev(resolve, () => reject("Failed to queue previous media"));
    });
  }

  /** Pause the currently playing track */
  static Next() {
    return new Promise((resolve, reject) => {
      cast.framework.CastContext.getInstance()
        .getCurrentSession()
        ?.getMediaSession()
        ?.queueNext(resolve, () => reject("Failed to queue next media"));
    });
  }

  // This does not work - it only loads two tracks at once
  static goToIndex(index: number) {
    return new Promise((resolve, reject) => {
      const session = cast.framework.CastContext.getInstance()
        .getCurrentSession()
        ?.getMediaSession();

      const item_id = session?.items?.[index]?.itemId;

      if (!item_id) {
        return;
      }

      return session?.queueJumpToItem(item_id, resolve, () =>
        reject("Failed to goToIndex"),
      );
    });
  }

  /** Get the current time of the track playing */
  static currentTime() {
    return (
      cast.framework.CastContext.getInstance()
        .getCurrentSession()
        ?.getMediaSession()
        ?.getEstimatedTime() ?? 0
    );
  }

  /**
   * Seek a time on the currently playing track
   *
   * @param time - time to seek to
   * @returns promise
   */
  static Seek(time: number) {
    return new Promise((resolve, reject) => {
      const request = new chrome.cast.media.SeekRequest();
      request.currentTime = time;

      cast.framework.CastContext.getInstance()
        .getCurrentSession()
        ?.getMediaSession()
        ?.seek(request, resolve, () => reject("Failed to seek"));
    });
  }
}
