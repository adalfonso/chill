package com.adalfonso.chill.media.playback;

import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.HttpDataSource;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import com.adalfonso.chill.media.auth.ServerConfig;
import com.adalfonso.chill.media.auth.SessionAuth;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONException;

/**
 * The native player and everything that keeps it useful: it saves the queue as it plays, can
 * reload it after the app was killed, and recovers once from an expired login mid-stream. All
 * calls must be made on the main thread.
 */
@UnstableApi
public final class NativePlayback {

  /** How often the position is saved while playing. */
  private static final long SAVE_EVERY_MS = 15_000;

  /** Where each item keeps the track exactly as the server sent it. */
  private static final String TRACK_JSON_KEY = "track_json";

  private final SessionAuth auth;
  private final QueueStore store;
  private final ServerConfig server;
  private final Runnable onStarted;
  private final ExoPlayer player;
  private final Handler main = new Handler(Looper.getMainLooper());
  private final ExecutorService background = Executors.newSingleThreadExecutor();
  private final Runnable periodicSave = this::savePeriodically;
  private String retriedItem;

  /**
   * @param player the player to look after
   * @param auth used to refresh the login when a stream is refused
   * @param server where the tracks are streamed from
   * @param store where the queue is saved
   * @param onStarted called each time playback begins
   */
  public NativePlayback(
      ExoPlayer player,
      SessionAuth auth,
      ServerConfig server,
      QueueStore store,
      Runnable onStarted) {
    this.player = player;
    this.auth = auth;
    this.server = server;
    this.store = store;
    this.onStarted = onStarted;
    player.addListener(new Watcher());
  }

  /** @return the player, for the media session to use */
  public ExoPlayer player() {
    return player;
  }

  /**
   * Reads the last saved queue as something the media session can start.
   *
   * @return the queue and where to resume it, or empty when nothing usable is saved
   */
  public Optional<MediaSession.MediaItemsWithStartPosition> savedQueue() {
    return store
        .load()
        .map(
            saved ->
                new MediaSession.MediaItemsWithStartPosition(
                    items(saved.tracks()), saved.index(), saved.positionMs()));
  }

  /** Saves the queue one last time and frees the player. */
  public void release() {
    save();
    main.removeCallbacks(periodicSave);
    background.shutdown();
    player.release();
  }

  /**
   * Builds playable items from tracks as the server sent them. Each item streams from the load
   * endpoint and keeps its track's JSON untouched for saving.
   *
   * @param tracks track JSON strings
   * @return one item per readable track, in order
   */
  public List<MediaItem> items(List<String> tracks) {
    List<MediaItem> items = new ArrayList<>();

    for (String json : tracks) {
      try {
        items.add(item(json));
      } catch (JSONException e) {
        // A track that cannot be read is skipped rather than spoiling the queue
      }
    }

    return items;
  }

  private MediaItem item(String json) throws JSONException {
    TrackJson.Track track = TrackJson.parse(json);
    Bundle extras = new Bundle();
    extras.putString(TRACK_JSON_KEY, json);

    MediaMetadata.Builder metadata =
        new MediaMetadata.Builder()
            .setTitle(track.title())
            .setArtist(track.artist())
            .setAlbumTitle(track.album())
            .setIsPlayable(true)
            .setIsBrowsable(false)
            .setExtras(extras);

    if (track.artFilename() != null) {
      metadata.setArtworkUri(
          Uri.parse(server.url("/api/v1/media/cover/" + Uri.encode(track.artFilename()) + "?size=256")));
    }

    return new MediaItem.Builder()
        .setMediaId(String.valueOf(track.id()))
        .setUri(server.url("/api/v1/media/" + track.id() + "/load"))
        .setMediaMetadata(metadata.build())
        .build();
  }

  /** Saves the queue as it is now, off the main thread. */
  private void save() {
    int count = player.getMediaItemCount();

    if (count == 0) {
      return;
    }

    List<String> tracks = new ArrayList<>();

    for (int i = 0; i < count; i++) {
      Bundle extras = player.getMediaItemAt(i).mediaMetadata.extras;
      String json = extras == null ? null : extras.getString(TRACK_JSON_KEY);

      if (json != null) {
        tracks.add(json);
      }
    }

    if (tracks.size() != count) {
      return;
    }

    QueueSnapshot snapshot =
        new QueueSnapshot(
            tracks,
            player.getCurrentMediaItemIndex(),
            Math.max(0, player.getCurrentPosition()),
            false,
            List.of());

    background.execute(
        () -> {
          try {
            store.save(snapshot);
          } catch (IOException e) {
            // Losing one save only costs a little resume accuracy
          }
        });
  }

  /** Saves, then schedules the next save while playing. */
  private void savePeriodically() {
    save();

    if (player.isPlaying()) {
      main.postDelayed(periodicSave, SAVE_EVERY_MS);
    }
  }

  /**
   * Whether a stream was refused because the login expired.
   *
   * @param error what the player reported
   */
  private static boolean isUnauthorized(PlaybackException error) {
    for (Throwable cause = error; cause != null; cause = cause.getCause()) {
      if (cause instanceof HttpDataSource.InvalidResponseCodeException refused
          && refused.responseCode == 401) {
        return true;
      }
    }

    return false;
  }

  /**
   * Refreshes the login and restarts the current item where it stopped. Done once per item, so a
   * login that is really gone does not loop.
   */
  private void recoverFromExpiredLogin() {
    MediaItem item = player.getCurrentMediaItem();

    if (item == null || item.mediaId.equals(retriedItem)) {
      return;
    }

    retriedItem = item.mediaId;
    int index = player.getCurrentMediaItemIndex();
    long position = player.getCurrentPosition();

    background.execute(
        () -> {
          if (auth.refresh() == SessionAuth.Outcome.REFRESHED) {
            main.post(
                () -> {
                  player.seekTo(index, position);
                  player.prepare();
                });
          }
        });
  }

  /** Reacts to what the player does. */
  private final class Watcher implements Player.Listener {

    @Override
    public void onIsPlayingChanged(boolean isPlaying) {
      main.removeCallbacks(periodicSave);

      if (isPlaying) {
        onStarted.run();
        main.postDelayed(periodicSave, SAVE_EVERY_MS);
      } else {
        save();
      }
    }

    @Override
    public void onMediaItemTransition(MediaItem mediaItem, int reason) {
      retriedItem = null;
      save();
    }

    @Override
    public void onPlayerError(PlaybackException error) {
      if (isUnauthorized(error)) {
        recoverFromExpiredLogin();
      }
    }
  }
}
