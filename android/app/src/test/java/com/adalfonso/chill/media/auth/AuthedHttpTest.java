package com.adalfonso.chill.media.auth;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;

import java.util.ArrayList;
import java.util.List;
import org.junit.Before;
import org.junit.Test;

public class AuthedHttpTest {

  private static final ServerConfig SERVER = new ServerConfig("https://chill.test");
  private static final String REFRESH_URL = "https://chill.test/auth/refresh";

  private final FakeJar jar = new FakeJar();
  private final List<String> requests = new ArrayList<>();
  private int apiStatus = 200;
  private int refreshStatus = 200;

  @Before
  public void setUp() {
    jar.byUrl.put(REFRESH_URL, "refresh=r1");
    jar.byUrl.put("https://chill.test", "access=a1");
  }

  private AuthedHttp http() {
    Transport transport = (method, url, headers) -> {
      requests.add(method + " " + url);

      if (url.equals(REFRESH_URL)) {
        return Reply.of(refreshStatus, "", refreshStatus == 200 ? List.of("access=a2; Path=/") : List.of());
      }

      return Reply.of(apiStatus, "body", List.of());
    };

    return new AuthedHttp(new SessionAuth(jar, transport, SERVER), transport, SERVER);
  }

  @Test
  public void a_good_request_needs_no_refresh() throws Exception {
    assertEquals(200, http().get("/api/v1/x").status());
    assertEquals(List.of("GET https://chill.test/api/v1/x"), requests);
  }

  @Test
  public void a_401_refreshes_once_then_retries_once() throws Exception {
    apiStatus = 401;

    assertEquals(401, http().get("/api/v1/x").status());
    assertEquals(3, requests.size());
    assertEquals("POST " + REFRESH_URL, requests.get(1));
  }

  @Test
  public void an_expired_access_cookie_is_refreshed_before_the_first_request() throws Exception {
    jar.byUrl.remove("https://chill.test");
    jar.byUrl.put("https://chill.test", null);

    // The refresh stores a cookie but the fake jar keeps none, so the retry reports signed out
    assertThrows(SignedOutException.class, () -> http().get("/api/v1/x"));
    assertEquals("POST " + REFRESH_URL, requests.get(0));
  }

  @Test
  public void a_refused_refresh_is_signed_out() {
    apiStatus = 401;
    refreshStatus = 401;

    assertThrows(SignedOutException.class, () -> http().get("/api/v1/x"));
  }
}
