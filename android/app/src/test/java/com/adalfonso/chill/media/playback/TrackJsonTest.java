package com.adalfonso.chill.media.playback;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

public class TrackJsonTest {

  @Test
  public void a_numeric_string_duration_is_read_as_seconds() throws Exception {
    assertEquals(
        215_400, TrackJson.parse("{\"id\":1,\"title\":\"t\",\"duration\":\"215.4\"}").durationMs());
  }

  @Test
  public void a_numeric_duration_is_read_as_seconds() throws Exception {
    assertEquals(90_000, TrackJson.parse("{\"id\":1,\"duration\":90}").durationMs());
  }

  @Test
  public void an_unparsable_or_missing_duration_is_unknown() throws Exception {
    assertEquals(
        TrackJson.UNKNOWN_DURATION, TrackJson.parse("{\"id\":1,\"duration\":\"x\"}").durationMs());
    assertEquals(TrackJson.UNKNOWN_DURATION, TrackJson.parse("{\"id\":1}").durationMs());
  }

  @Test
  public void text_and_cover_are_read() throws Exception {
    TrackJson.Track track =
        TrackJson.parse(
            "{\"id\":7,\"title\":\"T\",\"artist\":\"A\",\"album\":\"B\",\"album_art_filename\":null}");

    assertEquals(7, track.id());
    assertEquals("T", track.title());
    assertEquals("A", track.artist());
    assertEquals("B", track.album());
    assertNull(track.artFilename());
  }
}
