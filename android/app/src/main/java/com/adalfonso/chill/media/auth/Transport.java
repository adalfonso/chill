package com.adalfonso.chill.media.auth;

import java.io.IOException;
import java.util.Map;

/** Sends one HTTP request. Split out so tests can answer without a network. */
public interface Transport {

  /**
   * Sends a request and returns the answer.
   *
   * @throws IOException when the server cannot be reached
   */
  Reply send(String method, String url, Map<String, String> headers) throws IOException;
}
