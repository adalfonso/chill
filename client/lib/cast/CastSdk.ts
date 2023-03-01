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
}
