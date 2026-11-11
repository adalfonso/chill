package com.adalfonso.chill.media;

/**
 * Decides which WebView navigations mean the user is signed out.
 *
 * <p>Kept free of Android classes so it is covered by plain JVM tests; the
 * plugin hands it the path of each navigation.
 */
public final class NavigationPolicy {

  private static final String LOGIN_PATH = "/auth/login";

  private NavigationPolicy() {}

  /**
   * Whether a navigation path is the login page.
   *
   * <p>The WebView lands there after a sign-out and after a dead session, so the
   * car must stop showing the last track. A longer path that merely starts with
   * the same letters, such as {@code /auth/login-help}, is not the login page.
   *
   * @param path the path of the page being loaded, or null when there is none
   * @return true when the path is the login page or below it
   */
  public static boolean isLoginPath(String path) {
    if (path == null) {
      return false;
    }

    return path.equals(LOGIN_PATH) || path.startsWith(LOGIN_PATH + "/");
  }
}
