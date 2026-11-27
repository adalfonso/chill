package com.adalfonso.chill.media.auth;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** An in-memory cookie store that records what was saved. */
final class FakeJar implements CookieJar {

  final Map<String, String> byUrl = new HashMap<>();
  final List<String> stored = new ArrayList<>();

  @Override
  public String cookies(String url) {
    return byUrl.get(url);
  }

  @Override
  public void store(String url, String setCookie) {
    stored.add(setCookie);
  }
}
