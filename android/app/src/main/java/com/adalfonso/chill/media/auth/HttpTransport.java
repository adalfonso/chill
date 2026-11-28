package com.adalfonso.chill.media.auth;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.Map;

/**
 * Plain {@link HttpURLConnection} requests. It never installs a cookie handler, so the
 * cookie jar stays the only place cookies are read or written.
 */
public final class HttpTransport implements Transport {

  private static final int TIMEOUT_MS = 10_000;

  /** Sends the request and reads the whole answer. */
  @Override
  public Reply send(String method, String url, Map<String, String> headers) throws IOException {
    HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();

    try {
      connection.setRequestMethod(method);
      connection.setConnectTimeout(TIMEOUT_MS);
      connection.setReadTimeout(TIMEOUT_MS);
      headers.forEach(connection::setRequestProperty);

      int status = connection.getResponseCode();
      InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
      List<String> setCookies = connection.getHeaderFields().getOrDefault("Set-Cookie", List.of());

      return new Reply(status, read(stream), setCookies);
    } finally {
      connection.disconnect();
    }
  }

  /** Reads a stream to bytes; a missing stream is an empty body. */
  private static byte[] read(InputStream stream) throws IOException {
    if (stream == null) {
      return new byte[0];
    }

    try (stream) {
      ByteArrayOutputStream bytes = new ByteArrayOutputStream();

      stream.transferTo(bytes);

      return bytes.toByteArray();
    }
  }
}
