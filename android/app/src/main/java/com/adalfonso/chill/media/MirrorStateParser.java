package com.adalfonso.chill.media;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Turns the JSON snapshot of the web player into a {@link MirrorState}. The shape
 * is defined on the web side as {@code NativeMediaState} in
 * {@code common/nativeMedia.ts}; change one and you must change the other.
 */
public final class MirrorStateParser {

  // The page is trusted, but a compromised one must not be able to crash the service: media3
  // hands this data to other apps over Android's inter-process channel, which has a ~1 MB limit.

  /** Longest cover accepted, as base64 characters; a 256px JPEG is about a tenth of this. */
  static final int MAX_ART_CHARS = 300_000;

  /** Longest title, artist or album kept; anything longer is cut. */
  static final int MAX_TEXT_CHARS = 256;

  /** Largest duration or position accepted: a week, far beyond any real track. */
  static final long MAX_TIME_MS = 7L * 24 * 60 * 60 * 1000;

  private MirrorStateParser() {}

  /**
   * Reads one snapshot, converting the page's seconds to milliseconds and keeping
   * every value within sane limits (see the constants above).
   *
   * @throws JSONException if a required field is missing or the wrong type
   */
  public static MirrorState parse(JSONObject json) throws JSONException {
    MirrorState.Builder builder = new MirrorState.Builder();
    JSONObject track = json.isNull("track") ? null : json.getJSONObject("track");

    if (track != null) {
      builder
          .track(
              String.valueOf(track.getLong("id")),
              text(track, "title"),
              text(track, "artist"),
              text(track, "album"),
              millis(track.getDouble("duration_s")))
          .art(art(track));
    }

    return builder
        .playback(
            json.getBoolean("is_playing"),
            json.getBoolean("buffering"),
            millis(json.getDouble("position_s")))
        .queue(json.getBoolean("has_next"), json.getBoolean("has_previous"))
        .remote(json.getBoolean("remote"))
        .build();
  }

  /** Seconds to milliseconds, never negative and never past {@link #MAX_TIME_MS}. */
  private static long millis(double seconds) {
    return Math.min(MAX_TIME_MS, Math.max(0, Math.round(seconds * 1000)));
  }

  /** A text field, empty when null and cut to {@link #MAX_TEXT_CHARS}. */
  private static String text(JSONObject track, String key) throws JSONException {
    String value = track.isNull(key) ? "" : track.getString(key);

    return value.length() > MAX_TEXT_CHARS ? value.substring(0, MAX_TEXT_CHARS) : value;
  }

  /** The cover, or null when there is none or it is too large to pass on safely. */
  private static String art(JSONObject track) throws JSONException {
    String art = track.isNull("art_base64") ? null : track.getString("art_base64");

    return art != null && art.length() <= MAX_ART_CHARS ? art : null;
  }
}
