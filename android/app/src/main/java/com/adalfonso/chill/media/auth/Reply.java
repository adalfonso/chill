package com.adalfonso.chill.media.auth;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * One answer from the server: its status, its body as bytes (so cover art survives), and every
 * {@code Set-Cookie} header it sent.
 */
public record Reply(int status, byte[] body, List<String> setCookies) {

  /**
   * @param status the HTTP status
   * @param text the body as text
   * @param setCookies the {@code Set-Cookie} headers
   * @return a reply whose body is the text's UTF-8 bytes
   */
  public static Reply of(int status, String text, List<String> setCookies) {
    return new Reply(status, text.getBytes(StandardCharsets.UTF_8), setCookies);
  }

  /** @return the body read as UTF-8 text */
  public String text() {
    return new String(body, StandardCharsets.UTF_8);
  }
}
