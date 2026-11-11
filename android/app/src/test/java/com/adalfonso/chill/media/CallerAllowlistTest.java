package com.adalfonso.chill.media;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class CallerAllowlistTest {

  private static final String OWN = "com.adalfonso.chill";

  @Test
  public void android_auto_is_allowed() {
    assertTrue(CallerAllowlist.isAllowed(CallerAllowlist.ANDROID_AUTO, OWN));
  }

  @Test
  public void the_system_ui_and_framework_are_allowed() {
    assertTrue(CallerAllowlist.isAllowed(CallerAllowlist.SYSTEM_UI, OWN));
    assertTrue(CallerAllowlist.isAllowed(CallerAllowlist.ANDROID_FRAMEWORK, OWN));
  }

  @Test
  public void chill_itself_is_allowed() {
    assertTrue(CallerAllowlist.isAllowed(OWN, OWN));
  }

  @Test
  public void an_unlisted_package_is_rejected() {
    assertFalse(CallerAllowlist.isAllowed("com.example.snoop", OWN));
  }

  @Test
  public void a_lookalike_package_is_rejected() {
    assertFalse(CallerAllowlist.isAllowed("com.google.android.projection.gearhead.evil", OWN));
  }

  @Test
  public void a_missing_package_is_rejected() {
    assertFalse(CallerAllowlist.isAllowed(null, OWN));
  }
}
