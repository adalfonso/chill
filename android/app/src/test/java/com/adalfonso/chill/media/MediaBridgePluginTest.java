package com.adalfonso.chill.media;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

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
}
