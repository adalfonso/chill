package com.adalfonso.chill.media;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Turns the JSON snapshot of the web player into a {@link MirrorState}. The shape
 * is defined on the web side as {@code NativeMediaState} in
 * {@code common/nativeMedia.ts}; change one and you must change the other.
 */
public final class MirrorStateParser {

  private MirrorStateParser() {}

  /**
   * Reads one snapshot, converting the page's seconds to milliseconds.
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
              track.getString("title"),
              track.isNull("artist") ? "" : track.getString("artist"),
              track.isNull("album") ? "" : track.getString("album"),
              Math.round(track.getDouble("duration_s") * 1000))
          .art(track.isNull("art_base64") ? null : track.getString("art_base64"));
    }

    return builder
        .playback(
            json.getBoolean("is_playing"),
            json.getBoolean("buffering"),
            Math.round(json.getDouble("position_s") * 1000))
        .queue(json.getBoolean("has_next"), json.getBoolean("has_previous"))
        .remote(json.getBoolean("remote"))
        .build();
  }
}
