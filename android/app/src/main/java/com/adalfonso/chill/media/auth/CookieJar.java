package com.adalfonso.chill.media.auth;

/** Where the login cookies live. In the app this is the WebView's cookie store. */
public interface CookieJar {

  /** The {@code Cookie} header value for a URL ("a=1; b=2"), or null when there is none. */
  String cookies(String url);

  /** Saves one full {@code Set-Cookie} header, with its path, flags and expiry, for a URL. */
  void store(String url, String setCookie);
}
