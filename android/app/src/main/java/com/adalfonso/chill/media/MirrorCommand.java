package com.adalfonso.chill.media;

import java.util.Locale;

/**
 * A command from the car, on its way to the WebView player.
 *
 * @param action what the car asked for
 * @param positionSeconds the target position in seconds; only meaningful for a seek
 */
public record MirrorCommand(Action action, double positionSeconds) {

  /** What the car can ask the phone's player to do. */
  public enum Action {
    PLAY,
    PAUSE,
    NEXT,
    PREVIOUS,
    SEEK;

    /**
     * @return the name the WebView knows this action by, e.g. {@code pause}
     */
    public String wireName() {
      return name().toLowerCase(Locale.ROOT);
    }
  }

  /**
   * A command that carries no position.
   *
   * @param action what the car asked for
   * @return the command
   */
  public static MirrorCommand of(Action action) {
    return new MirrorCommand(action, 0);
  }

  /**
   * A seek to a position.
   *
   * @param positionMs the target position in milliseconds
   * @return the seek command, with the position converted to seconds
   */
  public static MirrorCommand seek(long positionMs) {
    return new MirrorCommand(Action.SEEK, positionMs / 1000.0);
  }
}
