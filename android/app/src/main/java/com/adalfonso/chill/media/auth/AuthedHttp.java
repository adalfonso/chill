package com.adalfonso.chill.media.auth;

import java.io.IOException;
import java.util.Map;

/**
 * Requests to the Chill server as the signed-in user. A 401 triggers one refresh and one
 * retry, so an expired access token is invisible to callers.
 */
public final class AuthedHttp {

  private final SessionAuth auth;
  private final Transport transport;
  private final ServerConfig server;

  /** Builds a client that signs requests with the cookies {@code auth} reads. */
  public AuthedHttp(SessionAuth auth, Transport transport, ServerConfig server) {
    this.auth = auth;
    this.transport = transport;
    this.server = server;
  }

  /**
   * Gets a path on the server. Blocks, so call it off the main thread. The access cookie
   * expires out of the jar after its lifetime, so a missing one is refreshed like a rejected
   * one. A second 401 after a successful refresh is returned as is.
   *
   * @throws IOException when the server cannot be reached
   * @throws SignedOutException when there is no login to use or refresh
   */
  public Reply get(String path) throws IOException {
    Reply first = auth.accessCookies() == null ? null : send(path);

    if (first != null && first.status() != 401) {
      return first;
    }

    SessionAuth.Outcome outcome = auth.refresh();

    if (outcome == SessionAuth.Outcome.SIGNED_OUT) {
      throw new SignedOutException();
    }

    if (outcome == SessionAuth.Outcome.TRANSIENT_FAILURE) {
      if (first != null) {
        return first;
      }

      throw new IOException("Could not refresh the login");
    }

    return send(path);
  }

  /** One signed request; no access cookie means signed out. */
  private Reply send(String path) throws IOException {
    String cookies = auth.accessCookies();

    if (cookies == null) {
      throw new SignedOutException();
    }

    return transport.send("GET", server.url(path), Map.of("Cookie", cookies));
  }
}
