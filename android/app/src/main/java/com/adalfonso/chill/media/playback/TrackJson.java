package com.adalfonso.chill.media.playback;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Reads the few fields the car needs out of a track as the server sends it. The full JSON is kept
 * elsewhere untouched; this only looks at it.
 */
public final class TrackJson {

  /** Marks a track whose length is not known. */
  public static final long UNKNOWN_DURATION = -1;

  /** What the car shows about one track; {@code artFilename} is null when it has no cover. */
  public record Track(
      long id, String title, String artist, String album, long durationMs, String artFilename) {}

  private TrackJson() {}

  /**
   * Reads one track.
   *
   * @param json the track as the server sent it
   * @return its id, text, length and cover filename
   * @throws JSONException if it is not a JSON object or has no id
   */
  public static Track parse(String json) throws JSONException {
    JSONObject track = new JSONObject(json);

    return new Track(
        track.getLong("id"),
        track.optString("title", ""),
        track.optString("artist", ""),
        track.optString("album", ""),
        durationMs(track.opt("duration")),
        track.isNull("album_art_filename") ? null : track.optString("album_art_filename", null));
  }

  /**
   * Converts the server's duration to milliseconds. Some routes send it as a number and others as
   * a numeric string.
   *
   * @param duration the duration in seconds, as a number or a string
   * @return the length in milliseconds, or {@link #UNKNOWN_DURATION}
   */
  private static long durationMs(Object duration) {
    try {
      double seconds =
          duration instanceof Number number
              ? number.doubleValue()
              : Double.parseDouble(String.valueOf(duration));

      return Double.isFinite(seconds) && seconds > 0
          ? Math.round(seconds * 1000)
          : UNKNOWN_DURATION;
    } catch (NumberFormatException e) {
      return UNKNOWN_DURATION;
    }
  }
}
