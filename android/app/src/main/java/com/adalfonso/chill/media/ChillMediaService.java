package com.adalfonso.chill.media;

import android.os.Bundle;
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
 * WebView's player; with nothing to mirror, the browse root holds a single
 * message item that tells the driver to start playback on the phone.
 *
 * <p>Only Android Auto, the system media controller, and Chill itself may
 * connect (see {@link CallerAllowlist}).
 */
@UnstableApi
public final class ChillMediaService extends MediaLibraryService {

  private static final String ROOT_ID = "chill-root";
  private static final String MESSAGE_ID = "chill-message";

  private MirrorPlayer player;
  private MediaLibrarySession session;

  @Override
  public void onCreate() {
    super.onCreate();
    player = new MirrorPlayer(Looper.getMainLooper(), MediaBridgeHub.instance());
    session = new MediaLibrarySession.Builder(this, player, new LibraryCallback()).build();
  }

  @Nullable
  @Override
  public MediaLibrarySession onGetSession(MediaSession.ControllerInfo controllerInfo) {
    return session;
  }

  @Override
  public void onDestroy() {
    session.release();
    player.detach();
    player.release();
    super.onDestroy();
  }

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

  /** Accepts allowed callers and serves the one-item message library. */
  private final class LibraryCallback implements MediaLibrarySession.Callback {

    @Override
    public MediaSession.ConnectionResult onConnect(
        MediaSession mediaSession, MediaSession.ControllerInfo controller) {
      if (!CallerAllowlist.isAllowed(controller.getPackageName(), getPackageName())) {
        return MediaSession.ConnectionResult.reject();
      }

      return MediaLibrarySession.Callback.super.onConnect(mediaSession, controller);
    }

    @Override
    public ListenableFuture<LibraryResult<MediaItem>> onGetLibraryRoot(
        MediaLibrarySession mediaSession,
        MediaSession.ControllerInfo browser,
        @Nullable LibraryParams params) {
      return Futures.immediateFuture(LibraryResult.ofItem(rootItem(), params));
    }

    @Override
    public ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> onGetChildren(
        MediaLibrarySession mediaSession,
        MediaSession.ControllerInfo browser,
        String parentId,
        int page,
        int pageSize,
        @Nullable LibraryParams params) {
      return Futures.immediateFuture(
          LibraryResult.ofItemList(ImmutableList.of(messageItem()), params));
    }

    @Override
    public ListenableFuture<LibraryResult<MediaItem>> onGetItem(
        MediaLibrarySession mediaSession, MediaSession.ControllerInfo browser, String mediaId) {
      MediaItem item = ROOT_ID.equals(mediaId) ? rootItem() : messageItem();

      return Futures.immediateFuture(LibraryResult.ofItem(item, null));
    }
  }
}
