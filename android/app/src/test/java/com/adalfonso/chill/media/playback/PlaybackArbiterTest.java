package com.adalfonso.chill.media.playback;

import static org.junit.Assert.assertEquals;

import java.util.ArrayList;
import java.util.List;
import org.junit.Test;

public class PlaybackArbiterTest {

  private final List<String> calls = new ArrayList<>();
  private final PlaybackArbiter arbiter =
      new PlaybackArbiter(
          new PlaybackArbiter.Handoff() {
            public void use(PlaybackArbiter.Side side) {
              calls.add("use " + side);
            }

            public void pauseWebView() {
              calls.add("pause web");
            }

            public void pauseNative() {
              calls.add("pause native");
            }
          });

  @Test
  public void native_starting_takes_the_session_and_pauses_the_page() {
    arbiter.onNativeStarted();

    assertEquals(List.of("use NATIVE", "pause web"), calls);
  }

  @Test
  public void the_page_starting_pauses_native_and_gives_the_session_back() {
    arbiter.onNativeStarted();
    calls.clear();

    arbiter.onWebViewState(true);

    assertEquals(List.of("pause native", "use MIRROR"), calls);
    assertEquals(PlaybackArbiter.Side.MIRROR, arbiter.active());
  }

  @Test
  public void a_page_already_playing_when_native_starts_does_not_take_it_back() {
    arbiter.onWebViewState(true);
    arbiter.onNativeStarted();
    calls.clear();

    arbiter.onWebViewState(true);

    assertEquals(List.of(), calls);
    assertEquals(PlaybackArbiter.Side.NATIVE, arbiter.active());
  }

  @Test
  public void the_page_playing_while_it_has_the_session_changes_nothing() {
    arbiter.onWebViewState(true);

    assertEquals(List.of(), calls);
  }
}
