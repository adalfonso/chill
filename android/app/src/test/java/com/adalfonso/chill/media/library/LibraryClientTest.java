package com.adalfonso.chill.media.library;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import com.adalfonso.chill.media.auth.AuthedHttp;
import com.adalfonso.chill.media.auth.FakeJar;
import com.adalfonso.chill.media.auth.Reply;
import com.adalfonso.chill.media.auth.ServerConfig;
import com.adalfonso.chill.media.auth.SessionAuth;
import com.adalfonso.chill.media.auth.Transport;
import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONObject;
import org.junit.Test;

public class LibraryClientTest {

  private final List<String> urls = new ArrayList<>();
  private int status = 200;
  private String body = "{\"result\":{\"data\":[]}}";

  private LibraryClient client() {
    ServerConfig server = new ServerConfig("https://chill.test");
    FakeJar jar = new FakeJar();
    jar.byUrl.put("https://chill.test", "access=a");
    Transport transport =
        (method, url, headers) -> {
          urls.add(url);

          return Reply.of(status, body, List.of());
        };

    return new LibraryClient(new AuthedHttp(new SessionAuth(jar, transport, server), transport, server));
  }

  private JSONObject lastInput() throws Exception {
    String url = urls.get(urls.size() - 1);

    return new JSONObject(
        URLDecoder.decode(url.substring(url.indexOf("?input=") + 7), StandardCharsets.UTF_8));
  }

  @Test
  public void page_two_of_fifty_becomes_the_servers_page_and_limit() throws Exception {
    client().albums(2, 50);

    JSONObject options = lastInput().getJSONObject("options");

    assertTrue(urls.get(0).contains("/api/v1/trpc/album.getTiles?input="));
    assertEquals(50, options.getInt("limit"));
    assertEquals(2, options.getInt("page"));
    assertEquals(0, options.getInt("offset"));
  }

  @Test
  public void albums_become_browsable_entries_with_covers() throws Exception {
    body = "{\"result\":{\"data\":[{\"id\":4,\"name\":\"Blue\",\"image\":\"b.jpg\"}]}}";

    Node album = client().albums(0, 10).get(0);

    assertEquals("album:4", album.id());
    assertEquals("Blue", album.title());
    assertEquals("b.jpg", album.artFilename());
    assertTrue(album.browsable());
  }

  @Test
  public void an_albums_tracks_are_asked_for_in_disc_and_track_order() throws Exception {
    body = "{\"result\":{\"data\":[{\"id\":1,\"title\":\"x\"}]}}";

    List<String> tracks = client().albumTracks(7);

    assertEquals(1, tracks.size());
    assertEquals(7, lastInput().getInt("album_id"));
    assertEquals("disc_number", lastInput().getJSONObject("options").getJSONArray("sort").getJSONObject(0).keys().next());
  }

  @Test
  public void an_empty_playlist_is_an_empty_list_not_an_error() throws Exception {
    assertTrue(client().playlistTracks(3).isEmpty());
  }

  @Test
  public void a_failed_request_is_an_io_error() {
    status = 500;

    assertThrows(IOException.class, () -> client().artists(0, 10));
  }

  @Test
  public void an_unreadable_answer_is_an_io_error() {
    body = "<html>";

    assertThrows(IOException.class, () -> client().playlists(0, 10));
  }
}
