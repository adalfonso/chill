package com.adalfonso.chill.media;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertSame;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.List;
import org.junit.Test;

public class MediaBridgeHubTest {

  private static MirrorState track() {
    return new MirrorState.Builder().track("1", "T", "A", "B", 1_000).build();
  }

  @Test
  public void publish_stamps_the_arrival_time() {
    MediaBridgeHub hub = new MediaBridgeHub(() -> 4_242, Runnable::run);

    hub.publish(track());

    assertEquals(4_242, hub.state().receivedAtMs);
  }

  @Test
  public void state_listeners_hear_every_change() {
    MediaBridgeHub hub = new MediaBridgeHub(() -> 0, Runnable::run);
    int[] heard = {0};
    hub.addStateListener(() -> heard[0]++);

    hub.publish(track());
    hub.clear();

    assertEquals(2, heard[0]);
  }

  @Test
  public void a_removed_listener_hears_nothing() {
    MediaBridgeHub hub = new MediaBridgeHub(() -> 0, Runnable::run);
    int[] heard = {0};
    MediaBridgeHub.StateListener listener = () -> heard[0]++;
    hub.addStateListener(listener);
    hub.removeStateListener(listener);

    hub.publish(track());

    assertEquals(0, heard[0]);
  }

  @Test
  public void clear_drops_the_track_art_and_position() {
    MediaBridgeHub hub = new MediaBridgeHub(() -> 0, Runnable::run);
    hub.publish(
        new MirrorState.Builder()
            .track("1", "T", "A", "B", 1_000)
            .art("abc")
            .playback(true, false, 500)
            .build());

    hub.clear();

    assertSame(MirrorState.EMPTY, hub.state());
    assertTrue(hub.state().showMessage());
  }

  @Test
  public void commands_reach_the_attached_sink() {
    MediaBridgeHub hub = new MediaBridgeHub(() -> 0, Runnable::run);
    List<MirrorCommand> received = new ArrayList<>();
    hub.setCommandSink(received::add);

    boolean delivered = hub.sendCommand(MirrorCommand.of(MirrorCommand.Action.PAUSE));

    assertTrue(delivered);
    assertEquals(MirrorCommand.Action.PAUSE, received.get(0).action());
  }

  @Test
  public void a_command_with_no_sink_is_dropped() {
    MediaBridgeHub hub = new MediaBridgeHub(() -> 0, Runnable::run);

    assertFalse(hub.sendCommand(MirrorCommand.of(MirrorCommand.Action.NEXT)));
  }

  @Test
  public void teardown_clears_state_and_drops_later_commands() {
    MediaBridgeHub hub = new MediaBridgeHub(() -> 0, Runnable::run);
    List<MirrorCommand> received = new ArrayList<>();
    hub.setCommandSink(received::add);
    hub.publish(track());

    hub.teardown();

    assertSame(MirrorState.EMPTY, hub.state());
    assertFalse(hub.sendCommand(MirrorCommand.of(MirrorCommand.Action.PLAY)));
    assertTrue(received.isEmpty());
  }

  @Test
  public void a_seek_command_converts_milliseconds_to_seconds() {
    assertEquals(30.0, MirrorCommand.seek(30_000).positionSeconds(), 0.0001);
    assertEquals(MirrorCommand.Action.SEEK, MirrorCommand.seek(1).action());
  }

  @Test
  public void signing_out_clears_the_playback_and_ignores_late_pushes() {
    MediaBridgeHub hub = new MediaBridgeHub(() -> 0, Runnable::run);
    hub.publish(track());

    hub.markSignedOut();
    hub.publish(track());

    assertSame(MirrorState.EMPTY, hub.state());
  }

  @Test
  public void pushes_are_accepted_again_once_signed_in() {
    MediaBridgeHub hub = new MediaBridgeHub(() -> 0, Runnable::run);
    hub.markSignedOut();

    hub.markSignedIn();
    hub.publish(track());

    assertTrue(hub.state().hasTrack);
  }

  @Test
  public void teardown_lifts_the_sign_out_block_for_the_next_screen() {
    MediaBridgeHub hub = new MediaBridgeHub(() -> 0, Runnable::run);
    hub.markSignedOut();

    hub.teardown();
    hub.publish(track());

    assertTrue(hub.state().hasTrack);
  }
}
