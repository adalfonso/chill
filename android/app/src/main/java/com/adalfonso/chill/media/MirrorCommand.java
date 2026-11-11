package com.adalfonso.chill.media;

import java.util.Locale;

/**
 * A button press from the car, on its way to the web player.
 *
 * @param action what the car asked for
 * @param positionSeconds the target position; only used for a seek
 */
public record MirrorCommand(Action action, double positionSeconds) {

  /** What the car can ask the phone's player to do. */
  public enum Action {
    PLAY,
    PAUSE,
    NEXT,
    PREVIOUS,
    SEEK;

    /** The lowercase name the web page knows this action by, such as {@code pause}. */
    public String wireName() {
      return name().toLowerCase(Locale.ROOT);
    }
  }

  /** A command with no position, such as pause. */
  public static MirrorCommand of(Action action) {
    return new MirrorCommand(action, 0);
  }

  /** A seek to a position given in milliseconds. */
  public static MirrorCommand seek(long positionMs) {
    return new MirrorCommand(Action.SEEK, positionMs / 1000.0);
  }
}
