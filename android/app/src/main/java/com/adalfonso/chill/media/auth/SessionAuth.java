package com.adalfonso.chill.media.auth;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Keeps the native side signed in using the cookies the WebView already holds. Cookies
 * are read fresh from the jar for every refresh and never kept, so a refresh the web page
 * did in the meantime is picked up and an old token is never replayed. Only one refresh
 * runs at a time; callers that arrive during it share its result.
 */
public final class SessionAuth {

  /** How a refresh ended. Only {@link #SIGNED_OUT} means the login is gone for good. */
  public enum Outcome {
    REFRESHED,
    SIGNED_OUT,
    TRANSIENT_FAILURE
  }

  private final CookieJar jar;
  private final Transport transport;
  private final ServerConfig server;
  private final List<Runnable> signedOutListeners = new CopyOnWriteArrayList<>();
  private final Object lock = new Object();
  private boolean refreshing;
  private Outcome lastOutcome = Outcome.TRANSIENT_FAILURE;

  /** Builds an auth helper over a cookie store and a way to send requests. */
  public SessionAuth(CookieJar jar, Transport transport, ServerConfig server) {
    this.jar = jar;
    this.transport = transport;
    this.server = server;
  }

  /** Calls the listener each time a refresh finds the login is gone. */
  public void addSignedOutListener(Runnable listener) {
    signedOutListeners.add(listener);
  }

  /** The {@code Cookie} header for a request to the server, or null when signed out. */
  public String accessCookies() {
    return jar.cookies(server.baseUrl());
  }

  /**
   * Gets a new access token. Blocks, so call it off the main thread. Callers arriving while
   * a refresh runs wait for it and get its result.
   */
  public Outcome refresh() {
    synchronized (lock) {
      if (refreshing) {
        return awaitRunning();
      }

      refreshing = true;
    }

    Outcome outcome = Outcome.TRANSIENT_FAILURE;

    try {
      outcome = refreshOnce(true);
    } finally {
      synchronized (lock) {
        lastOutcome = outcome;
        refreshing = false;
        lock.notifyAll();
      }
    }

    if (outcome == Outcome.SIGNED_OUT) {
      signedOutListeners.forEach(Runnable::run);
    }

    return outcome;
  }

  /** Waits for the refresh in progress and returns how it ended. Call holding the lock. */
  private Outcome awaitRunning() {
    try {
      while (refreshing) {
        lock.wait();
      }
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();

      return Outcome.TRANSIENT_FAILURE;
    }

    return lastOutcome;
  }

  /**
   * Sends one refresh. A 401 is retried once if the cookie changed in the meantime: the web
   * page may have won the same rotation, and its new cookie is already in the jar.
   */
  private Outcome refreshOnce(boolean mayRetry) {
    String sent = jar.cookies(server.refreshUrl());

    if (sent == null || sent.isEmpty()) {
      return Outcome.SIGNED_OUT;
    }

    Reply reply;

    try {
      reply = transport.send("POST", server.refreshUrl(), headersWith(sent));
    } catch (IOException e) {
      return Outcome.TRANSIENT_FAILURE;
    }

    if (reply.status() == 401) {
      boolean changed = !Objects.equals(sent, jar.cookies(server.refreshUrl()));

      return mayRetry && changed ? refreshOnce(false) : Outcome.SIGNED_OUT;
    }

    if (reply.status() != 200 || reply.setCookies().isEmpty()) {
      return Outcome.TRANSIENT_FAILURE;
    }

    // Stored against the refresh URL, as a browser would: each cookie keeps its own path
    reply.setCookies().forEach(cookie -> jar.store(server.refreshUrl(), cookie));

    return Outcome.REFRESHED;
  }

  /** The refresh request's headers: the required marker plus the cookies read from the jar. */
  private static Map<String, String> headersWith(String cookies) {
    return Map.of("X-Requested-With", "fetch", "Cookie", cookies);
  }
}
