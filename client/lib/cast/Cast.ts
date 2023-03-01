import { CastMedia, CastSdk } from "./CastSdk";
import { CastPayload, Session } from "./types";
import { Nullable } from "@common/types";

/** Interfaces with a Chromecast */
export class Cast {
  // Singleton instance
  static _instance: Nullable<Cast> = null;

  // Default Receiver
  private _app_id = chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID;

  // Cast Context
  private _ctx: Nullable<cast.framework.CastContext> = null;

  // If the SDK has loaded
  private _sdk_ready = false;

  // If the app ID and context have been initialized
  private _app_ready = false;

  // Controls playback on the session
  private _controller: cast.framework.RemotePlayerController;

  /** Create a new Cast instance */
  constructor() {
    this._controller = new cast.framework.RemotePlayerController(
      new cast.framework.RemotePlayer(),
    );

    this._controller.addEventListener(
      cast.framework.RemotePlayerEventType.CURRENT_TIME_CHANGED,
      (event) => {
        console.info("Current time:", event.value);
      },
    );
  }

  // TODO: Use this for displaying the cast icon
  public get ready() {
    return this._sdk_ready && this._app_ready;
  }

  /**
   * Sets the cast application id and initializes context
   *
   * @param id - app id
   */
  public set app_id(id: string) {
    this._app_id = id;
    this._ctx = cast.framework.CastContext.getInstance();

    this._ctx.setOptions({
      receiverApplicationId: this._app_id,
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
    });

    this._app_ready = true;
  }

  public set sdk_ready(ready: boolean) {
    if (this._sdk_ready) {
      return;
    }

    this._sdk_ready = ready;
  }

  /**
   * Get a singleton instance
   *
   * @returns instance
   */
  public static instance() {
    if (Cast._instance === null) {
      Cast._instance = new Cast();
    }

    return Cast._instance;
  }

  /**
   * Play media files from a payload
   *
   * @param payload - playlist items
   */
  public async play(payload: CastPayload) {
    if (!this.ready) {
      console.warn("Tried to play but Cast is not ready");
      return;
    }

    const session =
      cast.framework.CastContext.getInstance().getCurrentSession();

    if (session === null) {
      return console.warn(
        "Can't play audio because there is no Google cast session.",
      );
    }

    const [first_track, ...remaining_tracks] = payload.map(CastSdk.Media);

    // Load the first track, then queue any others
    session.loadMedia(CastSdk.Request(first_track)).then(
      () => {
        console.info("Load media request succeeded");

        if (remaining_tracks.length === 0) {
          return;
        }

        this._queue(remaining_tracks, session);
      },
      (errorCode) => console.error("Load media request failed: " + errorCode),
    );
  }

  /**
   * Queue tracks on the current media session
   *
   * @param tracks - tracks to queue
   * @param session - current session
   */
  private _queue(tracks: CastMedia[], session: Session) {
    console.info("Queueing additional tracks");

    const loadRequest = new chrome.cast.media.QueueInsertItemsRequest(
      tracks.map((track) => new chrome.cast.media.QueueItem(track)),
    );

    session.getMediaSession()?.queueInsertItems(
      loadRequest,
      () => console.info(`Successfully queued ${tracks.length} tracks`),
      (errorCode) => console.error("Queueing tracks failed: " + errorCode),
    );
  }
}

// Register the cast init event on the window
export const initCast = () => {
  window["__onGCastApiAvailable"] = (isAvailable) => {
    if (isAvailable) {
      // Init Cast
      Cast.instance();
    }
  };
};
