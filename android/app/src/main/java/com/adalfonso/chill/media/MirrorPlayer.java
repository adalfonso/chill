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
  // Kept in a field: a method reference makes a new object each time, so the
  // one passed to removeStateListener would never match the one added
  private final MediaBridgeHub.StateListener hubListener = this::invalidateState;

  /**
   * @param looper the application looper the media session runs on
   * @param hub the hub holding the pushed state and the command sink
   */
  public MirrorPlayer(Looper looper, MediaBridgeHub hub) {
    super(looper);
    this.hub = hub;
    hub.addStateListener(hubListener);
  }

  /** Stop listening to the hub. */
  public void detach() {
    hub.removeStateListener(hubListener);
  }

  /**
   * Build the player state the media session shows from the hub's snapshot.
   *
   * <p>With no local track, or while the phone is remote-controlling another
   * device, the player is idle with no commands, so the car shows the message.
   * Otherwise the playlist holds the current track and a placeholder either side
   * when the WebView's queue has a next or previous track.
   *
   * @return the player state
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
   * The current track's place in the playlist, which has a placeholder before it
   * when the queue has a previous track.
   *
   * @param state the current snapshot
   * @return 1 when there is a previous track, otherwise 0
   */
  private static int currentIndex(MirrorState state) {
    return state.hasPrevious ? 1 : 0;
  }

  /**
   * Work out which transport commands the car may use.
   *
   * @param state the current snapshot
   * @return play and pause always; seek only with a known duration; next and
   *     previous only when the queue has them
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
   * Build the current track's item, with its cover when it is valid.
   *
   * <p>A malformed cover is ignored so it cannot take the whole session down.
   *
   * @param state the current snapshot
   * @return the playlist item for the current track
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

  /**
   * Build an empty item that stands in for a neighbouring track.
   *
   * @param uid the item's unique id
   * @return the placeholder item
   */
  private static MediaItemData placeholder(String uid) {
    return new MediaItemData.Builder(uid)
        .setMediaItem(new MediaItem.Builder().setMediaId("chill-" + uid).build())
        .build();
  }

  /**
   * Send a play or pause from the car to the WebView.
   *
   * <p>The mirror's own state does not change; it follows the WebView's next
   * push.
   *
   * @param playWhenReady true for play, false for pause
   * @return an already-complete future
   */
  @Override
  protected ListenableFuture<?> handleSetPlayWhenReady(boolean playWhenReady) {
    hub.sendCommand(
        MirrorCommand.of(playWhenReady ? MirrorCommand.Action.PLAY : MirrorCommand.Action.PAUSE));

    return Futures.immediateVoidFuture();
  }

  /**
   * Turn a car seek into a command for the WebView.
   *
   * <p>A seek to a placeholder item is a next or previous; a seek within the
   * current item is a position seek.
   *
   * @param mediaItemIndex the playlist index the controller asked for
   * @param positionMs the position within that item
   * @param seekCommand the media3 command that caused the seek
   * @return an already-complete future
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
