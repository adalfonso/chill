package com.adalfonso.chill.media;

import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.Player;
import androidx.media3.common.SimpleBasePlayer;
import androidx.media3.common.util.UnstableApi;
import com.google.common.collect.ImmutableList;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;
import java.util.ArrayList;
import java.util.List;

/**
 * A player that plays nothing: it mirrors the WebView's player into the media
 * session so Android Auto can show it.
 *
 * <p>The WebView is the only source of truth in phase 1. This class never
 * changes state on its own. A command from the car goes to the WebView through
 * the {@link MediaBridgeHub}, and the car view updates only when the WebView
 * pushes its next snapshot. It never requests audio focus, so it cannot
 * interrupt the WebView's audio.
 *
 * <p>The playlist holds placeholder items either side of the current track so
 * that media3 treats next and previous as available exactly when the WebView's
 * queue has them. Seeking to a placeholder is translated into a next or
 * previous command.
 */
@UnstableApi
public final class MirrorPlayer extends SimpleBasePlayer {

  private final MediaBridgeHub hub;
  private final Handler handler;
  // Kept in a field: a method reference makes a new object each time, so the
  // one passed to removeStateListener would never match the one added
  private final MediaBridgeHub.StateListener hubListener = this::onHubChanged;

  /**
   * @param looper the application looper the media session runs on
   * @param hub the hub holding the pushed state and the command sink
   */
  public MirrorPlayer(Looper looper, MediaBridgeHub hub) {
    super(looper);
    this.hub = hub;
    this.handler = new Handler(looper);
    hub.addStateListener(hubListener);
  }

  /** Stop listening to the hub. */
  public void detach() {
    hub.removeStateListener(hubListener);
  }

  private void onHubChanged() {
    // The hub can change from the WebView's thread; the session needs its own
    handler.post(this::invalidateState);
  }

  @Override
  protected State getState() {
    MirrorState s = hub.state();
    State.Builder builder = new State.Builder();

    if (s.showMessage()) {
      return builder
          .setAvailableCommands(new Player.Commands.Builder().build())
          .setPlaybackState(Player.STATE_IDLE)
          .build();
    }

    List<MediaItemData> items = new ArrayList<>();

    if (s.hasPrevious) {
      items.add(placeholder("previous"));
    }

    items.add(currentItem(s));

    if (s.hasNext) {
      items.add(placeholder("next"));
    }

    return builder
        .setAvailableCommands(commandsFor(s))
        .setPlaybackState(s.buffering ? Player.STATE_BUFFERING : Player.STATE_READY)
        .setPlayWhenReady(s.isPlaying, Player.PLAY_WHEN_READY_CHANGE_REASON_USER_REQUEST)
        .setPlaylist(ImmutableList.copyOf(items))
        .setCurrentMediaItemIndex(s.hasPrevious ? 1 : 0)
        .setContentPositionMs(() -> s.positionAt(hub.now()))
        .build();
  }

  private static Player.Commands commandsFor(MirrorState s) {
    Player.Commands.Builder commands =
        new Player.Commands.Builder()
            .addAll(
                Player.COMMAND_PLAY_PAUSE,
                Player.COMMAND_GET_CURRENT_MEDIA_ITEM,
                Player.COMMAND_GET_TIMELINE,
                Player.COMMAND_GET_METADATA);

    if (s.durationMs > 0) {
      commands.add(Player.COMMAND_SEEK_IN_CURRENT_MEDIA_ITEM);
    }

    if (s.hasNext) {
      commands.addAll(Player.COMMAND_SEEK_TO_NEXT, Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM);
    }

    if (s.hasPrevious) {
      commands.addAll(
          Player.COMMAND_SEEK_TO_PREVIOUS, Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM);
    }

    return commands.build();
  }

  private static MediaItemData currentItem(MirrorState s) {
    MediaMetadata.Builder metadata =
        new MediaMetadata.Builder().setTitle(s.title).setArtist(s.artist).setAlbumTitle(s.album);

    if (s.artBase64 != null) {
      try {
        byte[] art = Base64.decode(s.artBase64, Base64.DEFAULT);
        metadata.setArtworkData(art, MediaMetadata.PICTURE_TYPE_FRONT_COVER);
      } catch (IllegalArgumentException e) {
        // A malformed cover must not take the whole session down; show no art
      }
    }

    MediaItem item =
        new MediaItem.Builder()
            .setMediaId("chill-" + s.trackId)
            .setMediaMetadata(metadata.build())
            .build();

    return new MediaItemData.Builder("current")
        .setMediaItem(item)
        .setDurationUs(s.durationMs * 1000)
        .setIsSeekable(s.durationMs > 0)
        .build();
  }

  private static MediaItemData placeholder(String uid) {
    return new MediaItemData.Builder(uid)
        .setMediaItem(new MediaItem.Builder().setMediaId("chill-" + uid).build())
        .build();
  }

  @Override
  protected ListenableFuture<?> handleSetPlayWhenReady(boolean playWhenReady) {
    hub.sendCommand(MirrorCommand.of(playWhenReady ? MirrorCommand.PLAY : MirrorCommand.PAUSE));

    return Futures.immediateVoidFuture();
  }

  @Override
  protected ListenableFuture<?> handleSeek(int mediaItemIndex, long positionMs, int seekCommand) {
    int current = hub.state().hasPrevious ? 1 : 0;

    if (mediaItemIndex > current) {
      hub.sendCommand(MirrorCommand.of(MirrorCommand.NEXT));
    } else if (mediaItemIndex < current) {
      hub.sendCommand(MirrorCommand.of(MirrorCommand.PREVIOUS));
    } else {
      hub.sendCommand(MirrorCommand.seek(Math.max(0, positionMs)));
    }

    return Futures.immediateVoidFuture();
  }
}
