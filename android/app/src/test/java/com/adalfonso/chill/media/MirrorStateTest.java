package com.adalfonso.chill.media;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class MirrorStateTest {

  private static MirrorState.Builder playingTrack() {
    return new MirrorState.Builder()
        .track("7", "Song", "Artist", "Album", 200_000)
        .playback(true, false, 10_000);
  }

  @Test
  public void empty_state_has_no_track_and_shows_the_message() {
    assertFalse(MirrorState.EMPTY.hasTrack);
    assertTrue(MirrorState.EMPTY.showMessage());
  }

  @Test
  public void a_local_track_does_not_show_the_message() {
    assertFalse(playingTrack().build().showMessage());
  }

  @Test
  public void remote_control_shows_the_message_even_with_a_track() {
    assertTrue(playingTrack().remote(true).build().showMessage());
  }

  @Test
  public void position_advances_from_the_push_while_playing() {
    MirrorState s = playingTrack().build().withReceivedAt(1_000);

    assertEquals(15_000, s.positionAt(6_000));
  }

  @Test
  public void position_holds_still_while_paused() {
    MirrorState s = playingTrack().playback(false, false, 10_000).build().withReceivedAt(1_000);

    assertEquals(10_000, s.positionAt(60_000));
  }

  @Test
  public void position_freezes_while_buffering() {
    MirrorState s = playingTrack().playback(true, true, 10_000).build().withReceivedAt(1_000);

    assertEquals(10_000, s.positionAt(60_000));
  }

  @Test
  public void position_never_runs_past_the_end_of_the_track() {
    MirrorState s = playingTrack().playback(true, false, 199_000).build().withReceivedAt(0);

    assertEquals(200_000, s.positionAt(60_000));
  }

  @Test
  public void a_clock_that_goes_backwards_does_not_rewind_the_position() {
    MirrorState s = playingTrack().build().withReceivedAt(5_000);

    assertEquals(10_000, s.positionAt(1_000));
  }

  @Test
  public void two_pushes_in_a_row_leave_only_the_later_one() {
    MediaBridgeHub hub = new MediaBridgeHub(() -> 0, Runnable::run);

    hub.publish(playingTrack().build());
    hub.publish(new MirrorState.Builder().track("8", "Other", "", "", 1_000).build());

    assertEquals("8", hub.state().trackId);
  }

  @Test
  public void a_state_with_no_next_track_reports_next_unavailable() {
    MirrorState s = playingTrack().queue(false, true).build();

    assertFalse(s.hasNext);
    assertTrue(s.hasPrevious);
  }

  @Test
  public void position_stops_running_ahead_when_the_page_stops_reporting() {
    MirrorState s = playingTrack().build().withReceivedAt(0);

    // 10 s at the push, then at most MAX_EXTRAPOLATION_MS more, however long ago it was
    assertEquals(10_000 + MirrorState.MAX_EXTRAPOLATION_MS, s.positionAt(10 * 60_000));
  }

  @Test
  public void position_keeps_advancing_normally_within_the_cap() {
    MirrorState s = playingTrack().build().withReceivedAt(0);

    assertEquals(10_000 + 20_000, s.positionAt(20_000));
  }
}
