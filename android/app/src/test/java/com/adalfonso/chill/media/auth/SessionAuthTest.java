package com.adalfonso.chill.media.auth;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.Before;
import org.junit.Test;

public class SessionAuthTest {

  private static final ServerConfig SERVER = new ServerConfig("https://chill.test/");
  private static final String REFRESH_URL = "https://chill.test/auth/refresh";

  private final FakeJar jar = new FakeJar();
  private final List<Map<String, String>> sentHeaders = new ArrayList<>();
  private Transport transport;

  @Before
  public void setUp() {
    jar.byUrl.put(REFRESH_URL, "__Secure-refresh_token=r1");
    jar.byUrl.put("https://chill.test", "__Secure-access_token=a1");
    transport = (method, url, headers) -> {
      sentHeaders.add(headers);

      return new Reply(200, "", List.of("__Secure-access_token=a2; Path=/; Secure; HttpOnly"));
    };
  }

  private SessionAuth auth() {
    return new SessionAuth(jar, (m, u, h) -> transport.send(m, u, h), SERVER);
  }

  @Test
  public void a_refresh_sends_the_marker_header_and_the_refresh_cookie() {
    auth().refresh();

    assertEquals("fetch", sentHeaders.get(0).get("X-Requested-With"));
    assertEquals("__Secure-refresh_token=r1", sentHeaders.get(0).get("Cookie"));
  }

  @Test
  public void a_successful_refresh_stores_every_set_cookie_whole() {
    transport = (m, u, h) -> new Reply(200, "", List.of("a=1; Path=/; Secure", "r=2; Path=/auth/refresh; Secure; HttpOnly; SameSite=Strict"));

    SessionAuth.Outcome outcome = auth().refresh();

    assertEquals(SessionAuth.Outcome.REFRESHED, outcome);
    assertEquals(List.of("a=1; Path=/; Secure", "r=2; Path=/auth/refresh; Secure; HttpOnly; SameSite=Strict"), jar.stored);
  }

  @Test
  public void no_refresh_cookie_is_signed_out_without_a_request() {
    jar.byUrl.remove(REFRESH_URL);

    assertEquals(SessionAuth.Outcome.SIGNED_OUT, auth().refresh());
    assertTrue(sentHeaders.isEmpty());
  }

  @Test
  public void a_401_with_an_unchanged_cookie_is_signed_out_and_does_not_loop() {
    transport = (m, u, h) -> {
      sentHeaders.add(h);

      return new Reply(401, "", List.of());
    };
    int[] heard = {0};
    SessionAuth auth = auth();
    auth.addSignedOutListener(() -> heard[0]++);

    assertEquals(SessionAuth.Outcome.SIGNED_OUT, auth.refresh());
    assertEquals(1, sentHeaders.size());
    assertEquals(1, heard[0]);
  }

  @Test
  public void a_401_after_the_page_rotated_the_cookie_is_retried_once() {
    AtomicInteger calls = new AtomicInteger();
    transport = (m, u, h) -> {
      sentHeaders.add(h);

      if (calls.getAndIncrement() == 0) {
        jar.byUrl.put(REFRESH_URL, "__Secure-refresh_token=r2");

        return new Reply(401, "", List.of());
      }

      return new Reply(200, "", List.of("a=1; Path=/"));
    };

    assertEquals(SessionAuth.Outcome.REFRESHED, auth().refresh());
    assertEquals("__Secure-refresh_token=r2", sentHeaders.get(1).get("Cookie"));
  }

  @Test
  public void network_failure_and_server_errors_are_transient_and_notify_nobody() {
    int[] heard = {0};
    SessionAuth auth = auth();
    auth.addSignedOutListener(() -> heard[0]++);

    transport = (m, u, h) -> {
      throw new IOException("down");
    };
    assertEquals(SessionAuth.Outcome.TRANSIENT_FAILURE, auth.refresh());

    transport = (m, u, h) -> new Reply(503, "", List.of());
    assertEquals(SessionAuth.Outcome.TRANSIENT_FAILURE, auth.refresh());
    assertEquals(0, heard[0]);
  }

  @Test
  public void simultaneous_refreshes_make_one_request() throws Exception {
    CountDownLatch inside = new CountDownLatch(1);
    CountDownLatch release = new CountDownLatch(1);
    AtomicInteger calls = new AtomicInteger();
    transport = (m, u, h) -> {
      calls.incrementAndGet();
      inside.countDown();

      try {
        release.await();
      } catch (InterruptedException e) {
        throw new IOException(e);
      }

      return new Reply(200, "", List.of("a=1; Path=/"));
    };
    SessionAuth auth = auth();
    SessionAuth.Outcome[] results = new SessionAuth.Outcome[2];
    Thread first = new Thread(() -> results[0] = auth.refresh());
    Thread second = new Thread(() -> results[1] = auth.refresh());

    first.start();
    inside.await();
    second.start();
    // Let the second caller reach the wait before the first request completes
    Thread.sleep(100);
    release.countDown();
    first.join();
    second.join();

    assertEquals(1, calls.get());
    assertEquals(SessionAuth.Outcome.REFRESHED, results[0]);
    assertEquals(SessionAuth.Outcome.REFRESHED, results[1]);
  }
}
