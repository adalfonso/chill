package com.adalfonso.chill.media.auth;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import android.webkit.CookieManager;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.After;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * The spike behind phase 2 sign-in: the cookie store must hand the native side the
 * HttpOnly, Secure, path-scoped cookies the server sets, using the same calls the service
 * uses. Run it on a device with the app process freshly started to check the cold case.
 */
@RunWith(AndroidJUnit4.class)
public class WebViewCookieJarTest {

  private static final String BASE = "https://chill.test";
  private static final String REFRESH = BASE + "/auth/refresh";

  private final WebViewCookieJar jar = new WebViewCookieJar();

  @After
  public void clear() {
    CookieManager.getInstance().removeAllCookies(null);
  }

  @Test
  public void an_http_only_secure_prefixed_access_cookie_is_readable_for_the_server_url() {
    jar.store(REFRESH, "__Secure-access_token=a1; Path=/; Secure; HttpOnly; SameSite=Lax");

    assertTrue(jar.cookies(BASE).contains("__Secure-access_token=a1"));
  }

  @Test
  public void the_refresh_cookie_is_readable_only_for_its_own_path() {
    jar.store(REFRESH, "__Secure-refresh_token=r1; Path=/auth/refresh; Secure; HttpOnly; SameSite=Strict");

    assertTrue(jar.cookies(REFRESH).contains("__Secure-refresh_token=r1"));
    assertNull(jar.cookies(BASE));
  }

  @Test
  public void a_rotated_value_replaces_the_old_one_and_keeps_its_path() {
    String cookie = "__Secure-refresh_token=%s; Path=/auth/refresh; Secure; HttpOnly; SameSite=Strict";

    jar.store(REFRESH, String.format(cookie, "r1"));
    jar.store(REFRESH, String.format(cookie, "r2"));

    assertTrue(jar.cookies(REFRESH).contains("r2"));
    assertFalse(jar.cookies(REFRESH).contains("r1"));
    assertNull(jar.cookies(BASE));
  }
}
