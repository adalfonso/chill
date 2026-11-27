package com.adalfonso.chill.media.auth;

import android.content.Context;
import com.getcapacitor.CapConfig;

/** Where the Chill server is: the same address the WebView loads. */
public final class ServerConfig {

  /** The path the refresh cookie is scoped to, and where refreshing happens. */
  public static final String REFRESH_PATH = "/auth/refresh";

  private final String baseUrl;

  /** Uses an explicit address, with or without a trailing slash. */
  public ServerConfig(String baseUrl) {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
  }

  /**
   * Reads the address from the Capacitor config bundled with the app, which works with no
   * Activity running.
   */
  public static ServerConfig fromCapacitor(Context context) {
    return new ServerConfig(CapConfig.loadDefault(context).getServerUrl());
  }

  /** The server's address, with no trailing slash. */
  public String baseUrl() {
    return baseUrl;
  }

  /** The full URL for a path on the server such as "/api/v1/media/1/load". */
  public String url(String path) {
    return baseUrl + path;
  }

  /** The refresh endpoint, whose URL the refresh cookie is read with. */
  public String refreshUrl() {
    return url(REFRESH_PATH);
  }
}
