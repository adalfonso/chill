package com.adalfonso.chill.media;

/** A command from the car, on its way to the WebView player. */
public final class MirrorCommand {

  public static final String PLAY = "play";
  public static final String PAUSE = "pause";
  public static final String NEXT = "next";
  public static final String PREVIOUS = "previous";
  public static final String SEEK = "seek";

  public final String action;
  /** Target position in seconds; only meaningful for {@link #SEEK}. */
  public final double positionSeconds;

  /**
   * @param action one of the action constants
   * @param positionSeconds the target position in seconds; ignored unless the
   *     action is {@link #SEEK}
   */
  public MirrorCommand(String action, double positionSeconds) {
    this.action = action;
    this.positionSeconds = positionSeconds;
  }

  /**
   * A seek to a position.
   *
   * @param positionMs the target position in milliseconds
   * @return the seek command, with the position converted to seconds
   */
  public static MirrorCommand seek(long positionMs) {
    return new MirrorCommand(SEEK, positionMs / 1000.0);
  }

  /**
   * A command that carries no position.
   *
   * @param action one of the action constants
   * @return the command
   */
  public static MirrorCommand of(String action) {
    return new MirrorCommand(action, 0);
  }
}
