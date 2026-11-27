package com.adalfonso.chill.media.playback;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Keeps the last queue in a file so the car can resume it after the app was killed. A save writes
 * a temporary file and renames it over the real one, so a crash mid-write leaves the previous
 * queue intact. A file that is corrupt or from another version is deleted rather than guessed at.
 */
public final class QueueStore {

  /** Bumped whenever the file layout changes; older or newer files are discarded. */
  static final int VERSION = 1;

  private final Path file;
  private final Path temp;

  /**
   * @param file where the queue is kept; its folder must exist
   */
  public QueueStore(Path file) {
    this.file = file;
    this.temp = file.resolveSibling(file.getFileName() + ".tmp");
  }

  /**
   * Saves the queue, replacing any earlier one.
   *
   * @param snapshot the queue to keep
   * @throws IOException if the file cannot be written
   */
  public void save(QueueSnapshot snapshot) throws IOException {
    String text = toJson(snapshot).toString();

    Files.write(temp, text.getBytes(StandardCharsets.UTF_8));
    Files.move(temp, file, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
  }

  /**
   * Reads the saved queue.
   *
   * @return the queue, or empty when there is none or the file was unusable (and so deleted)
   */
  public Optional<QueueSnapshot> load() {
    if (!Files.exists(file)) {
      return Optional.empty();
    }

    try {
      return Optional.of(
          fromJson(new JSONObject(new String(Files.readAllBytes(file), StandardCharsets.UTF_8))));
    } catch (IOException | JSONException e) {
      delete();

      return Optional.empty();
    }
  }

  /** Forgets the saved queue, for example on sign-out. */
  public void delete() {
    try {
      Files.deleteIfExists(file);
      Files.deleteIfExists(temp);
    } catch (IOException e) {
      // Nothing more can be done; the next save replaces the file anyway
    }
  }

  private static JSONObject toJson(QueueSnapshot snapshot) throws IOException {
    try {
      return new JSONObject()
          .put("version", VERSION)
          .put("tracks", new JSONArray(snapshot.tracks()))
          .put("index", snapshot.index())
          .put("position_ms", snapshot.positionMs())
          .put("shuffled", snapshot.shuffled())
          .put("original_order", new JSONArray(snapshot.originalOrder()));
    } catch (JSONException e) {
      throw new IOException(e);
    }
  }

  /**
   * Rebuilds a queue and checks it makes sense.
   *
   * @throws JSONException if the version differs, a field is missing, a track is unreadable, or
   *     the index points outside the tracks
   */
  private static QueueSnapshot fromJson(JSONObject json) throws JSONException {
    if (json.getInt("version") != VERSION) {
      throw new JSONException("unknown version");
    }

    JSONArray stored = json.getJSONArray("tracks");
    List<String> tracks = new ArrayList<>();

    for (int i = 0; i < stored.length(); i++) {
      String track = stored.getString(i);

      TrackJson.parse(track);
      tracks.add(track);
    }

    int index = json.getInt("index");

    if (tracks.isEmpty() || index < 0 || index >= tracks.size()) {
      throw new JSONException("bad queue");
    }

    JSONArray order = json.getJSONArray("original_order");
    List<Long> originalOrder = new ArrayList<>();

    for (int i = 0; i < order.length(); i++) {
      originalOrder.add(order.getLong(i));
    }

    return new QueueSnapshot(
        tracks,
        index,
        Math.max(0, json.getLong("position_ms")),
        json.getBoolean("shuffled"),
        originalOrder);
  }
}
