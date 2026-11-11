package com.adalfonso.chill.media;

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

/**
 * A pretend music player for Android's media system. It plays no sound: it reports
 * whatever the web page last sent, so Android Auto can show it. Car button presses
 * are forwarded to the web player through the hub, and the car view only changes
 * when the page next reports. It never takes audio focus, so it cannot interrupt
 * the page's audio. (media3's {@code SimpleBasePlayer} lets a player be described
 * by returning its state from {@link #getState}.)
 */
@UnstableApi
public final class MirrorPlayer extends SimpleBasePlayer {

  private final MediaBridgeHub hub;
  // Kept in a field: a method reference makes a new object each time, so the
  // one passed to removeStateListener would never match the one added
  private final MediaBridgeHub.StateListener hubListener = this::invalidateState;

  /** Starts mirroring the hub, refreshing the media session whenever it changes. */
  public MirrorPlayer(Looper looper, MediaBridgeHub hub) {
    super(looper);
    this.hub = hub;
    hub.addStateListener(hubListener);
  }

  /** Stops mirroring the hub. */
  public void detach() {
    hub.removeStateListener(hubListener);
  }

  /**
   * Describes the player for the media session: idle with no controls when there is
   * nothing to show, otherwise the current track with an empty placeholder item before
   * and after it, so next and previous appear exactly when the queue has them.
   */
  @Override
  protected State getState() {
    MirrorState state = hub.state();

    if (state.showMessage()) {
      return new State.Builder()
          .setAvailableCommands(Player.Commands.EMPTY)
          .setPlaybackState(Player.STATE_IDLE)
          .build();
    }

    ImmutableList.Builder<MediaItemData> items = ImmutableList.builder();

    if (state.hasPrevious) {
      items.add(placeholder("previous"));
    }

    items.add(currentItem(state));

    if (state.hasNext) {
      items.add(placeholder("next"));
    }

    return new State.Builder()
        .setAvailableCommands(commandsFor(state))
        .setPlaybackState(state.buffering ? Player.STATE_BUFFERING : Player.STATE_READY)
        .setPlayWhenReady(state.isPlaying, Player.PLAY_WHEN_READY_CHANGE_REASON_USER_REQUEST)
        .setPlaylist(items.build())
        .setCurrentMediaItemIndex(currentIndex(state))
        .setContentPositionMs(() -> state.positionAt(hub.now()))
        .build();
  }

  /**
   * The current track's place in the playlist: 1 when a previous-track placeholder sits before it.
   */
  private static int currentIndex(MirrorState state) {
    return state.hasPrevious ? 1 : 0;
  }

  /**
   * The buttons the car may show: play/pause always, seek if the length is known, next and previous
   * if the queue has them.
   */
  private static Player.Commands commandsFor(MirrorState state) {
    Player.Commands.Builder commands =
        new Player.Commands.Builder()
            .addAll(
                Player.COMMAND_PLAY_PAUSE,
                Player.COMMAND_GET_CURRENT_MEDIA_ITEM,
                Player.COMMAND_GET_TIMELINE,
                Player.COMMAND_GET_METADATA);

    if (state.durationMs > 0) {
      commands.add(Player.COMMAND_SEEK_IN_CURRENT_MEDIA_ITEM);
    }

    if (state.hasNext) {
      commands.addAll(Player.COMMAND_SEEK_TO_NEXT, Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM);
    }

    if (state.hasPrevious) {
      commands.addAll(
          Player.COMMAND_SEEK_TO_PREVIOUS, Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM);
    }

    return commands.build();
  }

  /**
   * The current track's playlist item, with title, artist, album and cover; a bad cover is ignored.
   */
  private static MediaItemData currentItem(MirrorState state) {
    MediaMetadata.Builder metadata =
        new MediaMetadata.Builder()
            .setTitle(state.title)
            .setArtist(state.artist)
            .setAlbumTitle(state.album);

    if (state.artBase64 != null) {
      try {
        byte[] art = Base64.decode(state.artBase64, Base64.DEFAULT);
        metadata.setArtworkData(art, MediaMetadata.PICTURE_TYPE_FRONT_COVER);
      } catch (IllegalArgumentException e) {
        // A malformed cover must not take the whole session down; show no art
      }
    }

    MediaItem item =
        new MediaItem.Builder()
            .setMediaId("chill-" + state.trackId)
            .setMediaMetadata(metadata.build())
            .build();

    return new MediaItemData.Builder("current")
        .setMediaItem(item)
        .setDurationUs(state.durationMs * 1000)
        .setIsSeekable(state.durationMs > 0)
        .build();
  }

  /** An empty stand-in item for a neighbouring track. */
  private static MediaItemData placeholder(String uid) {
    return new MediaItemData.Builder(uid)
        .setMediaItem(new MediaItem.Builder().setMediaId("chill-" + uid).build())
        .build();
  }

  /**
   * The car pressed play or pause: sends it to the web player. Our own state waits for the page to
   * report back.
   */
  @Override
  protected ListenableFuture<?> handleSetPlayWhenReady(boolean playWhenReady) {
    hub.sendCommand(
        MirrorCommand.of(playWhenReady ? MirrorCommand.Action.PLAY : MirrorCommand.Action.PAUSE));

    return Futures.immediateVoidFuture();
  }

  /**
   * The car sought: a jump to the next or previous placeholder is a next or previous command,
   * anything else is a seek within the track.
   */
  @Override
  protected ListenableFuture<?> handleSeek(int mediaItemIndex, long positionMs, int seekCommand) {
    int current = currentIndex(hub.state());

    if (mediaItemIndex > current) {
      hub.sendCommand(MirrorCommand.of(MirrorCommand.Action.NEXT));
    } else if (mediaItemIndex < current) {
      hub.sendCommand(MirrorCommand.of(MirrorCommand.Action.PREVIOUS));
    } else {
      hub.sendCommand(MirrorCommand.seek(Math.max(0, positionMs)));
    }

    return Futures.immediateVoidFuture();
  }
}
