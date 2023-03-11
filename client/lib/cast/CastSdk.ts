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

    media.metadata = {
      title: meta.title,
      albumArtist: meta.artist,
      artist: meta.artist,
      albumName: meta.album,
      releaseDate: meta.year?.toString(),
      images: meta.cover && [
        new chrome.cast.Image(
          `/cast/media/cover/${meta.cover.filename}?size=500&token=${token}`,
        ),
      ],
    };

    return media;
  }

  /**
   * Create a cast LoadRequest with media
   *
   * @param media - media to load
   * @returns request
   */
  static Request(media: CastMedia) {
    const request = new chrome.cast.media.LoadRequest(media);
    request.autoplay = true;
    request.customData = {};

    return request;
  }

  /** Play the currently paused track */
  static Play() {
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

  static goToIndex(index: number) {
    console.log("go to index", index);

    return new Promise((resolve, reject) => {
      const session = cast.framework.CastContext.getInstance()
        .getCurrentSession()
        ?.getMediaSession();

      console.log({ session });
      return cast.framework.CastContext.getInstance()
        .getCurrentSession()
        ?.getMediaSession()
        ?.queueJumpToItem(index, resolve, () => reject("Failed to goToIndex"));
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
}
