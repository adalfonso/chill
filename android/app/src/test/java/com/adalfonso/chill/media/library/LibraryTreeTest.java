package com.adalfonso.chill.media.library;

import static org.junit.Assert.assertEquals;

import java.util.List;
import java.util.stream.Collectors;
import org.junit.Test;

public class LibraryTreeTest {

  @Test
  public void the_root_lists_shuffle_playlists_albums_artists_in_order() {
    List<Node> root = LibraryTree.rootChildren(List.of("Shuffle all", "Playlists", "Albums", "Artists"));

    assertEquals(
        List.of("Shuffle all", "Playlists", "Albums", "Artists"),
        root.stream().map(Node::title).collect(Collectors.toList()));
    assertEquals(true, root.get(0).playable());
    assertEquals(true, root.get(1).browsable());
  }

  @Test
  public void a_track_id_remembers_its_list() {
    List<Node> nodes =
        LibraryTree.trackNodes(
            LibraryTree.albumId(5),
            List.of("{\"id\":10,\"title\":\"a\"}", "{\"id\":11,\"title\":\"b\"}"));

    assertEquals("album:5/track:10", nodes.get(0).id());
    assertEquals(
        new LibraryTree.Target(LibraryTree.Kind.TRACK_IN_ALBUM, 5, 11),
        LibraryTree.parse(nodes.get(1).id()));
  }

  @Test
  public void lists_and_playlist_tracks_parse() {
    assertEquals(LibraryTree.Kind.ALBUM_LIST, LibraryTree.parse("albums").kind());
    assertEquals(
        new LibraryTree.Target(LibraryTree.Kind.PLAYLIST, 3, -1), LibraryTree.parse("playlist:3"));
    assertEquals(
        new LibraryTree.Target(LibraryTree.Kind.TRACK_IN_PLAYLIST, 3, 9),
        LibraryTree.parse("playlist:3/track:9"));
  }

  @Test
  public void ids_that_are_not_ours_are_unknown() {
    assertEquals(LibraryTree.Kind.UNKNOWN, LibraryTree.parse("whatever").kind());
    assertEquals(LibraryTree.Kind.UNKNOWN, LibraryTree.parse("album:x").kind());
    assertEquals(LibraryTree.Kind.UNKNOWN, LibraryTree.parse("album:1/song:2").kind());
  }

  @Test
  public void an_unreadable_track_is_left_out() {
    assertEquals(1, LibraryTree.trackNodes("album:1", List.of("nope", "{\"id\":2}")).size());
  }
}
