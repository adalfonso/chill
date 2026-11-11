package com.adalfonso.chill.media;

import android.os.Handler;
import android.os.Looper;
import androidx.annotation.Nullable;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.session.LibraryResult;
import androidx.media3.session.MediaLibraryService;
import androidx.media3.session.MediaSession;
import com.adalfonso.chill.R;
import com.google.common.collect.ImmutableList;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;

/**
 * The service Android Auto connects to.
 *
 * <p>Android Auto finds it through the manifest, binds to it even when the app
 * is not running, and reads the now-playing state from its media session. In
 * phase 1 the session is backed by a {@link MirrorPlayer} that mirrors the
 * WebView's player. The browse root holds a single item: a message that tells
 * the driver to start playback on the phone while there is nothing to mirror, and
 * the current track once there is. Connected controllers are told when it
 * changes, so the message goes away on its own.
 *
 * <p>Only Android Auto, the system media controller, and Chill itself may
 * connect (see {@link CallerAllowlist}).
 */
@UnstableApi
public final class ChillMediaService extends MediaLibraryService {

  private static final String ROOT_ID = "chill-root";
  private static final String MESSAGE_ID = "chill-message";
  private static final String NOW_PLAYING_ID = "chill-now-playing";

  private final MediaBridgeHub hub = MediaBridgeHub.instance();
  private final MediaBridgeHub.StateListener hubListener = this::onHubChanged;
  private Handler handler;
  private MirrorPlayer player;
  private MediaLibrarySession session;
  private String browseKey;

  /** Create the mirror player and the media session Android Auto connects to. */
  @Override
  public void onCreate() {
    super.onCreate();
    handler = new Handler(Looper.getMainLooper());
    player = new MirrorPlayer(Looper.getMainLooper(), hub);
    session = new MediaLibrarySession.Builder(this, player, new LibraryCallback()).build();
    browseKey = browseKey(hub.state());
    hub.addStateListener(hubListener);
  }

  /**
   * @param controllerInfo the controller asking for the session
   * @return the one media session this service hosts
   */
  @Nullable
  @Override
  public MediaLibrarySession onGetSession(MediaSession.ControllerInfo controllerInfo) {
    return session;
  }

  /** Release the session and the player. */
  @Override
  public void onDestroy() {
    hub.removeStateListener(hubListener);
    handler.removeCallbacksAndMessages(null);
    session.release();
    player.detach();
    player.release();
    super.onDestroy();
  }

  /**
   * Tell connected controllers to reload the browse list when what it shows changes.
   *
   * <p>The hub can change on the WebView's thread, so the check runs on the main
   * looper. Without this, a car that opened the app before the phone was ready
   * keeps showing the old message until the driver navigates away and back.
   */
  private void onHubChanged() {
    handler.post(
        () -> {
          String key = browseKey(hub.state());

          if (!key.equals(browseKey)) {
            browseKey = key;
            session.notifyChildrenChanged(ROOT_ID, 1, null);
          }
        });
  }

  /**
   * A short string that changes exactly when the browse list should change.
   *
   * @param state the current snapshot
   * @return one value for the message, and one per track shown
   */
  static String browseKey(MirrorState state) {
    return state.showMessage() ? "message" : "track:" + state.trackId + ":" + state.title;
  }

  /**
   * @return the browse root item
   */
  private MediaItem rootItem() {
    return new MediaItem.Builder()
        .setMediaId(ROOT_ID)
        .setMediaMetadata(
            new MediaMetadata.Builder()
                .setIsBrowsable(true)
                .setIsPlayable(false)
                .setTitle(getString(R.string.app_name))
                .build())
        .build();
  }

  /**
   * @return the single item that tells the driver to start playback on the phone
   */
  private MediaItem messageItem() {
    return new MediaItem.Builder()
        .setMediaId(MESSAGE_ID)
        .setMediaMetadata(
            new MediaMetadata.Builder()
                .setIsBrowsable(false)
                .setIsPlayable(false)
                .setTitle(getString(R.string.car_start_on_phone))
                .build())
        .build();
  }

  /**
   * @param state the current snapshot, which has a local track
   * @return an item naming the track playing on the phone; tapping it does nothing
   */
  private MediaItem nowPlayingItem(MirrorState state) {
    return new MediaItem.Builder()
        .setMediaId(NOW_PLAYING_ID)
        .setMediaMetadata(
            new MediaMetadata.Builder()
                .setIsBrowsable(false)
                .setIsPlayable(false)
                .setTitle(state.title)
                .setArtist(state.artist)
                .setAlbumTitle(state.album)
                .build())
        .build();
  }

  /**
   * @return the one item the browse root holds right now
   */
  private MediaItem currentChild() {
    MirrorState state = hub.state();

    return state.showMessage() ? messageItem() : nowPlayingItem(state);
  }

  /** Accepts allowed callers and serves the one-item library. */
  private final class LibraryCallback implements MediaLibrarySession.Callback {

    /**
     * Accept a controller only when it is on the allowlist.
     *
     * @param mediaSession the session being connected to
     * @param controller the controller asking to connect
     * @return an accepted result for an allowed caller, otherwise a rejection
     */
    @Override
    public MediaSession.ConnectionResult onConnect(
        MediaSession mediaSession, MediaSession.ControllerInfo controller) {
      if (!CallerAllowlist.isAllowed(controller.getPackageName(), getPackageName())) {
        return MediaSession.ConnectionResult.reject();
      }

      return MediaLibrarySession.Callback.super.onConnect(mediaSession, controller);
    }

    /**
     * @param mediaSession the session being browsed
     * @param browser the controller browsing
     * @param params the browse parameters, if any
     * @return the browse root
     */
    @Override
    public ListenableFuture<LibraryResult<MediaItem>> onGetLibraryRoot(
        MediaLibrarySession mediaSession,
        MediaSession.ControllerInfo browser,
        @Nullable LibraryParams params) {
      return Futures.immediateFuture(LibraryResult.ofItem(rootItem(), params));
    }

    /**
     * @param mediaSession the session being browsed
     * @param browser the controller browsing
     * @param parentId the item whose children are wanted
     * @param page the page number
     * @param pageSize the page size
     * @param params the browse parameters, if any
     * @return a list holding the message, or the current track once there is one
     */
    @Override
    public ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> onGetChildren(
        MediaLibrarySession mediaSession,
        MediaSession.ControllerInfo browser,
        String parentId,
        int page,
        int pageSize,
        @Nullable LibraryParams params) {
      return Futures.immediateFuture(
          LibraryResult.ofItemList(ImmutableList.of(currentChild()), params));
    }

    /**
     * @param mediaSession the session being browsed
     * @param browser the controller browsing
     * @param mediaId the item asked for
     * @return the root, or the item the root currently holds
     */
    @Override
    public ListenableFuture<LibraryResult<MediaItem>> onGetItem(
        MediaLibrarySession mediaSession, MediaSession.ControllerInfo browser, String mediaId) {
      MediaItem item = ROOT_ID.equals(mediaId) ? rootItem() : currentChild();

      return Futures.immediateFuture(LibraryResult.ofItem(item, null));
    }
  }
}
