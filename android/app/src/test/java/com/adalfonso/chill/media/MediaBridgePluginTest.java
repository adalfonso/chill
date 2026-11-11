package com.adalfonso.chill.media;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertSame;
import static org.junit.Assert.assertTrue;

import com.getcapacitor.JSObject;
import org.junit.Test;

public class MediaBridgePluginTest {

  @Test
  public void the_login_page_is_a_login_path() {
    assertTrue(MediaBridgePlugin.isLoginPath("/auth/login"));
  }

  @Test
  public void a_path_below_the_login_page_is_a_login_path() {
    assertTrue(MediaBridgePlugin.isLoginPath("/auth/login/"));
    assertTrue(MediaBridgePlugin.isLoginPath("/auth/login/retry"));
  }

  @Test
  public void other_auth_paths_are_not_login_paths() {
    assertFalse(MediaBridgePlugin.isLoginPath("/auth/logout"));
    assertFalse(MediaBridgePlugin.isLoginPath("/auth/google"));
    assertFalse(MediaBridgePlugin.isLoginPath("/auth/login-help"));
  }

  @Test
  public void app_paths_are_not_login_paths() {
    assertFalse(MediaBridgePlugin.isLoginPath("/"));
    assertFalse(MediaBridgePlugin.isLoginPath("/library/albums"));
  }

  @Test
  public void a_missing_path_is_not_a_login_path() {
    assertFalse(MediaBridgePlugin.isLoginPath(null));
  }

  private static MediaBridgeHub playingHub() {
    MediaBridgeHub hub = new MediaBridgeHub(() -> 0, Runnable::run);
    hub.publish(new MirrorState.Builder().track("1", "T", "A", "B", 1_000).build());

    return hub;
  }

  @Test
  public void navigating_to_the_login_page_clears_the_car_view() {
    MediaBridgeHub hub = playingHub();

    MediaBridgePlugin.applyNavigation(hub, "/auth/login");

    assertSame(MirrorState.EMPTY, hub.state());
  }

  @Test
  public void a_late_push_after_the_login_page_loads_is_ignored() {
    MediaBridgeHub hub = playingHub();
    MediaBridgePlugin.applyNavigation(hub, "/auth/login");

    hub.publish(new MirrorState.Builder().track("2", "Late", "A", "B", 1_000).build());

    assertSame(MirrorState.EMPTY, hub.state());
  }

  @Test
  public void loading_the_app_after_sign_in_accepts_pushes_again() {
    MediaBridgeHub hub = playingHub();
    MediaBridgePlugin.applyNavigation(hub, "/auth/login");

    MediaBridgePlugin.applyNavigation(hub, "/");
    hub.publish(new MirrorState.Builder().track("3", "Back", "A", "B", 1_000).build());

    assertEquals("3", hub.state().trackId);
  }

  @Test
  public void a_pause_command_goes_to_the_page_by_name_with_no_position() {
    JSObject payload = MediaBridgePlugin.commandPayload(MirrorCommand.of(MirrorCommand.Action.PAUSE));

    assertEquals("pause", payload.getString("action"));
    assertFalse(payload.has("position_s"));
  }

  @Test
  public void a_seek_command_carries_its_position_in_seconds() throws Exception {
    JSObject payload = MediaBridgePlugin.commandPayload(MirrorCommand.seek(30_000));

    assertEquals("seek", payload.getString("action"));
    assertEquals(30.0, payload.getDouble("position_s"), 0.001);
  }
}
