package com.adalfonso.chill.media.auth;

import android.webkit.CookieManager;

/**
 * The cookie store the WebView uses, so the native service and the web page share one
 * login. Android's {@code CookieManager} returns a URL's cookies as bare name=value
 * pairs and only those whose path matches, which is why the refresh cookie must be read
 * with the refresh URL.
 */
public final class WebViewCookieJar implements CookieJar {

  /** Reads a URL's cookies, HttpOnly ones included. */
  @Override
  public String cookies(String url) {
    return CookieManager.getInstance().getCookie(url);
  }

  /** Saves the cookie and writes the store to disk so a restart keeps it. */
  @Override
  public void store(String url, String setCookie) {
    CookieManager manager = CookieManager.getInstance();

    manager.setCookie(url, setCookie);
    manager.flush();
  }
}
