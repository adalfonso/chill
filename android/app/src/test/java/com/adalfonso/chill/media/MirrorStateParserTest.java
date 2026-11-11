package com.adalfonso.chill.media;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.json.JSONException;
import org.json.JSONObject;
import org.junit.Test;

public class MirrorStateParserTest {

  private static final String FULL =
      "{\"track\":{\"id\":7,\"title\":\"Song\",\"artist\":\"Artist\",\"album\":\"Album\","
          + "\"duration_s\":200.5,\"art_base64\":\"QUJD\"},\"is_playing\":true,"
          + "\"buffering\":false,\"position_s\":12.25,\"has_next\":true,"
          + "\"has_previous\":false,\"remote\":false}";

  @Test
  public void parses_a_full_push() throws JSONException {
    MirrorState s = MirrorStateParser.parse(new JSONObject(FULL));

    assertTrue(s.hasTrack);
    assertEquals("7", s.trackId);
    assertEquals("Song", s.title);
    assertEquals(200_500, s.durationMs);
    assertEquals(12_250, s.positionMs);
    assertEquals("QUJD", s.artBase64);
    assertTrue(s.isPlaying);
    assertTrue(s.hasNext);
    assertFalse(s.hasPrevious);
  }

  @Test
  public void a_null_track_parses_to_no_track() throws JSONException {
    String json =
        "{\"track\":null,\"is_playing\":false,\"buffering\":false,\"position_s\":0,"
            + "\"has_next\":false,\"has_previous\":false,\"remote\":false}";

    assertFalse(MirrorStateParser.parse(new JSONObject(json)).hasTrack);
  }

  @Test
  public void null_artist_album_and_art_are_tolerated() throws JSONException {
    String json =
        "{\"track\":{\"id\":1,\"title\":\"T\",\"artist\":null,\"album\":null,"
            + "\"duration_s\":10,\"art_base64\":null},\"is_playing\":false,\"buffering\":true,"
            + "\"position_s\":0,\"has_next\":false,\"has_previous\":false,\"remote\":true}";

    MirrorState s = MirrorStateParser.parse(new JSONObject(json));

    assertEquals("", s.artist);
    assertEquals("", s.album);
    assertNull(s.artBase64);
    assertTrue(s.buffering);
    assertTrue(s.remote);
  }

  @Test(expected = JSONException.class)
  public void a_missing_required_field_is_rejected() throws JSONException {
    MirrorStateParser.parse(new JSONObject("{\"track\":null}"));
  }

  private static JSONObject push(String trackJson) throws JSONException {
    return new JSONObject(
        "{\"track\":"
            + trackJson
            + ",\"is_playing\":true,\"buffering\":false,\"position_s\":5,"
            + "\"has_next\":false,\"has_previous\":false,\"remote\":false}");
  }

  @Test
  public void an_oversized_cover_is_dropped_but_the_track_still_shows() throws JSONException {
    // A cover this big would not fit in the inter-process message that carries it to other apps
    String huge = "A".repeat(MirrorStateParser.MAX_ART_CHARS + 1);

    MirrorState s =
        MirrorStateParser.parse(
            push(
                "{\"id\":1,\"title\":\"T\",\"artist\":null,\"album\":null,"
                    + "\"duration_s\":10,\"art_base64\":\""
                    + huge
                    + "\"}"));

    assertTrue(s.hasTrack);
    assertNull(s.artBase64);
  }

  @Test
  public void a_cover_at_the_limit_is_kept() throws JSONException {
    String ok = "A".repeat(MirrorStateParser.MAX_ART_CHARS);

    MirrorState s =
        MirrorStateParser.parse(
            push(
                "{\"id\":1,\"title\":\"T\",\"artist\":null,\"album\":null,"
                    + "\"duration_s\":10,\"art_base64\":\""
                    + ok
                    + "\"}"));

    assertEquals(ok, s.artBase64);
  }

  @Test
  public void very_long_text_is_cut_to_a_sane_length() throws JSONException {
    String long_text = "x".repeat(10_000);

    MirrorState s =
        MirrorStateParser.parse(
            push(
                "{\"id\":1,\"title\":\""
                    + long_text
                    + "\",\"artist\":\""
                    + long_text
                    + "\",\"album\":\""
                    + long_text
                    + "\",\"duration_s\":10,\"art_base64\":null}"));

    assertEquals(MirrorStateParser.MAX_TEXT_CHARS, s.title.length());
    assertEquals(MirrorStateParser.MAX_TEXT_CHARS, s.artist.length());
    assertEquals(MirrorStateParser.MAX_TEXT_CHARS, s.album.length());
  }

  @Test
  public void absurd_durations_and_positions_are_clamped() throws JSONException {
    MirrorState huge =
        MirrorStateParser.parse(
            new JSONObject(
                "{\"track\":{\"id\":1,\"title\":\"T\",\"artist\":null,\"album\":null,"
                    + "\"duration_s\":1e300,\"art_base64\":null},\"is_playing\":true,"
                    + "\"buffering\":false,\"position_s\":1e300,\"has_next\":false,"
                    + "\"has_previous\":false,\"remote\":false}"));

    assertEquals(MirrorStateParser.MAX_TIME_MS, huge.durationMs);
    assertEquals(MirrorStateParser.MAX_TIME_MS, huge.positionMs);
  }

  @Test
  public void negative_times_become_zero() throws JSONException {
    MirrorState s =
        MirrorStateParser.parse(
            new JSONObject(
                "{\"track\":{\"id\":1,\"title\":\"T\",\"artist\":null,\"album\":null,"
                    + "\"duration_s\":-5,\"art_base64\":null},\"is_playing\":true,"
                    + "\"buffering\":false,\"position_s\":-9,\"has_next\":false,"
                    + "\"has_previous\":false,\"remote\":false}"));

    assertEquals(0, s.durationMs);
    assertEquals(0, s.positionMs);
  }
}
