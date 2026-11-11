package com.adalfonso.chill.media;

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
 * The media service Android Auto connects to (an Android "Service" is a background
 * component with no screen that other apps can connect to). It hosts the media
 * session built on {@link MirrorPlayer}. The browse screen in the car is a
 * one-entry list: a message to start playback on the phone, or the current track
 * once there is one. Only apps on the {@link CallerAllowlist} may connect.
 */
@UnstableApi
public final class ChillMediaService extends MediaLibraryService {

  private static final String ROOT_ID = "chill-root";
  private static final String MESSAGE_ID = "chill-message";
  private static final String NOW_PLAYING_ID = "chill-now-playing";

  private final MediaBridgeHub hub = MediaBridgeHub.instance();
  private final MediaBridgeHub.StateListener hubListener = this::onHubChanged;
  private MirrorPlayer player;
  private MediaLibrarySession session;
  private String browseKey;

  /** Creates the player and the media session, and starts watching the hub. */
  @Override
  public void onCreate() {
    super.onCreate();
    player = new MirrorPlayer(Looper.getMainLooper(), hub);
    session = new MediaLibrarySession.Builder(this, player, new LibraryCallback()).build();
    browseKey = browseKey(hub.state());
    hub.addStateListener(hubListener);
  }

  /** Hands Android the session when an app such as Android Auto connects. */
  @Nullable
  @Override
  public MediaLibrarySession onGetSession(MediaSession.ControllerInfo controllerInfo) {
    return session;
  }

  /** Stops watching the hub and releases the session and player. */
  @Override
  public void onDestroy() {
    hub.removeStateListener(hubListener);
    session.release();
    player.detach();
    player.release();
    super.onDestroy();
  }

  /**
   * When the list's entry would change, tells connected apps to reload it, so the message goes away
   * on its own.
   */
  private void onHubChanged() {
    String key = browseKey(hub.state());

    if (!key.equals(browseKey)) {
      browseKey = key;
      session.notifyChildrenChanged(ROOT_ID, 1, null);
    }
  }

  /** A short label for what the list shows now; it changes exactly when the list should reload. */
  private static String browseKey(MirrorState state) {
    return state.showMessage() ? "message" : "track:" + state.trackId + ":" + state.title;
  }

  /** The top of the browse tree. */
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

  /** The "start playback on the phone" entry. */
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

  /** An entry naming the track playing on the phone; tapping it does nothing. */
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

  /** The one entry the list holds right now: the message, or the current track. */
  private MediaItem currentChild() {
    MirrorState state = hub.state();

    return state.showMessage() ? messageItem() : nowPlayingItem(state);
  }

  /** Answers Android Auto's requests to connect and to browse. */
  private final class LibraryCallback implements MediaLibrarySession.Callback {

    /** Lets an app connect only if the {@link CallerAllowlist} allows it. */
    @Override
    public MediaSession.ConnectionResult onConnect(
        MediaSession mediaSession, MediaSession.ControllerInfo controller) {
      if (!CallerAllowlist.isAllowed(controller.getPackageName(), getPackageName())) {
        return MediaSession.ConnectionResult.reject();
      }

      return MediaLibrarySession.Callback.super.onConnect(mediaSession, controller);
    }

    /** Returns the top of the browse tree. */
    @Override
    public ListenableFuture<LibraryResult<MediaItem>> onGetLibraryRoot(
        MediaLibrarySession mediaSession,
        MediaSession.ControllerInfo browser,
        @Nullable LibraryParams params) {
      return Futures.immediateFuture(LibraryResult.ofItem(rootItem(), params));
    }

    /** Returns the list's single entry. */
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

    /** Returns one entry by id. */
    @Override
    public ListenableFuture<LibraryResult<MediaItem>> onGetItem(
        MediaLibrarySession mediaSession, MediaSession.ControllerInfo browser, String mediaId) {
      MediaItem item = ROOT_ID.equals(mediaId) ? rootItem() : currentChild();

      return Futures.immediateFuture(LibraryResult.ofItem(item, null));
    }
  }
}
