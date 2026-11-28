package com.adalfonso.chill.media.library;

import com.adalfonso.chill.media.playback.TrackJson;
import java.util.List;
import org.json.JSONException;

/**
 * The shape of the car's browse screen, and the ids that name each place in it. The top level is
 * Shuffle all, Playlists, Albums and Artists; playlists and albums list their tracks, artists
 * list their albums. A track's id carries the list it was chosen from, so playing it queues that
 * whole list starting at the track.
 */
public final class LibraryTree {

  public static final String ROOT = "chill-root";
  public static final String SHUFFLE = "shuffle";
  public static final String PLAYLISTS = "playlists";
  public static final String ALBUMS = "albums";
  public static final String ARTISTS = "artists";

  /** What an id points at. */
  public enum Kind {
    ROOT,
    SHUFFLE,
    PLAYLIST_LIST,
    ALBUM_LIST,
    ARTIST_LIST,
    PLAYLIST,
    ALBUM,
    ARTIST,
    TRACK_IN_PLAYLIST,
    TRACK_IN_ALBUM,
    UNKNOWN
  }

  /**
   * A parsed id: the kind of place, the list's id when it has one, and the track's id when the id
   * names a track within a list (otherwise -1).
   */
  public record Target(Kind kind, long listId, long trackId) {}

  private LibraryTree() {}

  /**
   * @param rootTitle the app's name, shown for the top of the tree
   * @param labels titles for the four entries, in order: shuffle, playlists, albums, artists
   * @return the four top-level entries in the order the car shows them
   */
  public static List<Node> rootChildren(List<String> labels) {
    return List.of(
        new Node(SHUFFLE, labels.get(0), "", null, false, true),
        new Node(PLAYLISTS, labels.get(1), "", null, true, false),
        new Node(ALBUMS, labels.get(2), "", null, true, false),
        new Node(ARTISTS, labels.get(3), "", null, true, false));
  }

  /** @return the id of a playlist, which lists its tracks */
  public static String playlistId(long id) {
    return "playlist:" + id;
  }

  /** @return the id of an album, which lists its tracks */
  public static String albumId(long id) {
    return "album:" + id;
  }

  /** @return the id of an artist, which lists its albums */
  public static String artistId(long id) {
    return "artist:" + id;
  }

  /**
   * Turns a list's tracks into entries whose ids remember the list.
   *
   * @param listId the id of the playlist or album they came from
   * @param tracks the tracks as the server sent them
   * @return one playable entry per readable track, in order
   */
  public static List<Node> trackNodes(String listId, List<String> tracks) {
    return tracks.stream()
        .map(LibraryTree::readTrack)
        .filter(track -> track != null)
        .map(
            track ->
                new Node(
                    listId + "/track:" + track.id(),
                    track.title(),
                    track.artist(),
                    track.artFilename(),
                    false,
                    true))
        .toList();
  }

  /**
   * Works out what an id points at.
   *
   * @param mediaId an id given out by this tree
   * @return the kind, list id and track id; kind UNKNOWN when it is not one of ours
   */
  public static Target parse(String mediaId) {
    switch (mediaId) {
      case ROOT:
        return new Target(Kind.ROOT, -1, -1);
      case SHUFFLE:
        return new Target(Kind.SHUFFLE, -1, -1);
      case PLAYLISTS:
        return new Target(Kind.PLAYLIST_LIST, -1, -1);
      case ALBUMS:
        return new Target(Kind.ALBUM_LIST, -1, -1);
      case ARTISTS:
        return new Target(Kind.ARTIST_LIST, -1, -1);
      default:
        return parseList(mediaId);
    }
  }

  private static Target parseList(String mediaId) {
    String[] parts = mediaId.split("/");

    try {
      String[] list = parts[0].split(":");
      long listId = Long.parseLong(list[1]);

      if (parts.length == 1) {
        return switch (list[0]) {
          case "playlist" -> new Target(Kind.PLAYLIST, listId, -1);
          case "album" -> new Target(Kind.ALBUM, listId, -1);
          case "artist" -> new Target(Kind.ARTIST, listId, -1);
          default -> unknown();
        };
      }

      String[] track = parts[1].split(":");
      long trackId = Long.parseLong(track[1]);

      if (!"track".equals(track[0])) {
        return unknown();
      }

      return switch (list[0]) {
        case "playlist" -> new Target(Kind.TRACK_IN_PLAYLIST, listId, trackId);
        case "album" -> new Target(Kind.TRACK_IN_ALBUM, listId, trackId);
        default -> unknown();
      };
    } catch (ArrayIndexOutOfBoundsException | NumberFormatException e) {
      return unknown();
    }
  }

  private static Target unknown() {
    return new Target(Kind.UNKNOWN, -1, -1);
  }

  private static TrackJson.Track readTrack(String json) {
    try {
      return TrackJson.parse(json);
    } catch (JSONException e) {
      return null;
    }
  }
}
