package com.adalfonso.chill.media.library;

import com.adalfonso.chill.media.auth.AuthedHttp;
import com.adalfonso.chill.media.auth.Reply;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.function.LongFunction;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Asks the server's library routes (the same ones the web app uses) for what the car shows. Every
 * call blocks, so call it off the main thread, and fails with an IOException when the server
 * cannot answer.
 */
public final class LibraryClient {

  /** Most tracks fetched when queueing a whole album or playlist. */
  static final int MAX_QUEUE = 500;

  private static final String TRPC = "/api/v1/trpc/";

  private final AuthedHttp http;

  /**
   * @param http signs each request with the user's login
   */
  public LibraryClient(AuthedHttp http) {
    this.http = http;
  }

  /**
   * @param page which page, counting from 0
   * @param size how many per page
   * @return that page of playlists
   */
  public List<Node> playlists(int page, int size) throws IOException {
    return tiles("playlist.index", json("options", options(page, size, "[]")), "title", false, LibraryTree::playlistId);
  }

  /** @return that page of albums, by title */
  public List<Node> albums(int page, int size) throws IOException {
    return tiles("album.getTiles", json("options", options(page, size, "[]")), "name", true, LibraryTree::albumId);
  }

  /** @return that page of artists, by name */
  public List<Node> artists(int page, int size) throws IOException {
    return tiles("artist.getArtistTiles", json("options", options(page, size, "[]")), "name", true, LibraryTree::artistId);
  }

  /** @return that page of one artist's albums */
  public List<Node> artistAlbums(long artistId, int page, int size) throws IOException {
    return tiles(
        "album.getTiles",
        json("filter", json("artist_id", artistId), "options", options(page, size, "[]")),
        "name",
        true,
        LibraryTree::albumId);
  }

  /** @return an album's tracks in disc and track order, as the server sent them */
  public List<String> albumTracks(long albumId) throws IOException {
    String order = "[{\"disc_number\":\"asc\"},{\"number\":\"asc\"}]";

    return tracks("track.get", json("album_id", albumId, "options", options(0, MAX_QUEUE, order)));
  }

  /** @return a playlist's tracks in order, as the server sent them */
  public List<String> playlistTracks(long playlistId) throws IOException {
    return tracks("playlist.tracks", json("id", playlistId, "options", options(0, MAX_QUEUE, "[]")));
  }

  /** @return random tracks from the whole library, as the server sent them */
  public List<String> randomTracks(int count) throws IOException {
    return tracks("track.getRandomTracks", json("limit", count, "exclusions", new JSONArray()));
  }

  /**
   * The server's pagination: media3's zero-based page and size become its {@code page} and
   * {@code limit}, with no extra offset.
   */
  private static JSONObject options(int page, int size, String sort) {
    try {
      return json("limit", size, "page", page, "offset", 0, "sort", new JSONArray(sort));
    } catch (JSONException e) {
      throw new IllegalArgumentException(e);
    }
  }

  /** Builds a JSON object from alternating keys and values. */
  private static JSONObject json(Object... pairs) {
    JSONObject object = new JSONObject();

    try {
      for (int i = 0; i < pairs.length; i += 2) {
        object.put((String) pairs[i], pairs[i + 1]);
      }
    } catch (JSONException e) {
      throw new IllegalArgumentException(e);
    }

    return object;
  }

  /**
   * Reads a list of tiles (playlists, albums or artists) into entries.
   *
   * @param nameField the field holding each row's title
   * @param hasImage whether rows carry an {@code image} cover filename
   * @param idOf builds an entry's id from the row's id
   */
  private List<Node> tiles(
      String route, JSONObject input, String nameField, boolean hasImage, LongFunction<String> idOf)
      throws IOException {
    JSONArray rows = call(route, input);
    List<Node> nodes = new ArrayList<>();

    try {
      for (int i = 0; i < rows.length(); i++) {
        JSONObject row = rows.getJSONObject(i);
        String image = hasImage && !row.isNull("image") ? row.getString("image") : null;

        nodes.add(new Node(idOf.apply(row.getLong("id")), row.optString(nameField, ""), "", image, true, false));
      }
    } catch (JSONException e) {
      throw new IOException("unreadable library answer", e);
    }

    return nodes;
  }

  private List<String> tracks(String route, JSONObject input) throws IOException {
    JSONArray rows = call(route, input);
    List<String> tracks = new ArrayList<>();

    try {
      for (int i = 0; i < rows.length(); i++) {
        tracks.add(rows.getJSONObject(i).toString());
      }
    } catch (JSONException e) {
      throw new IOException("unreadable library answer", e);
    }

    return tracks;
  }

  /**
   * Calls a route and unwraps tRPC's {@code result.data} envelope.
   *
   * @throws IOException when the server errors or answers with something unreadable
   */
  private JSONArray call(String route, JSONObject input) throws IOException {
    String path = TRPC + route + "?input=" + URLEncoder.encode(input.toString(), StandardCharsets.UTF_8);
    Reply reply = http.get(path);

    if (reply.status() != 200) {
      throw new IOException("library request failed: " + reply.status());
    }

    try {
      return new JSONObject(reply.text()).getJSONObject("result").getJSONArray("data");
    } catch (JSONException e) {
      throw new IOException("unreadable library answer", e);
    }
  }
}
