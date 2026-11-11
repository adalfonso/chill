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
}
