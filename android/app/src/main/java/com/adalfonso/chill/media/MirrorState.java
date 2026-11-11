package com.adalfonso.chill.media;

/**
 * An immutable snapshot of the phone's WebView player, as pushed to native.
 *
 * <p>The native media service mirrors this into Android Auto and never changes
 * it on its own: the WebView is the only source of truth in phase 1. Position
 * between pushes is worked out from the time the snapshot arrived, so the
 * WebView does not have to push every second.
 *
 * <p>This class has no Android dependencies, so it is covered by plain JVM unit
 * tests.
 */
public final class MirrorState {

  /** The state before anything has been pushed, or after a clear. */
  public static final MirrorState EMPTY = new Builder().build();

  public final boolean hasTrack;
  public final String trackId;
  public final String title;
  public final String artist;
  public final String album;
  public final long durationMs;
  /** Cover as base64 JPEG, or null when none has loaded. */
  public final String artBase64;
  public final boolean isPlaying;
  public final boolean buffering;
  public final long positionMs;
  public final boolean hasNext;
  public final boolean hasPrevious;
  /** True while the phone is remote-controlling another Chill device. */
  public final boolean remote;
  /** When this snapshot arrived, in the clock the hub uses. */
  public final long receivedAtMs;

  private MirrorState(Builder b) {
    this.hasTrack = b.hasTrack;
    this.trackId = b.trackId;
    this.title = b.title;
    this.artist = b.artist;
    this.album = b.album;
    this.durationMs = b.durationMs;
    this.artBase64 = b.artBase64;
    this.isPlaying = b.isPlaying;
    this.buffering = b.buffering;
    this.positionMs = b.positionMs;
    this.hasNext = b.hasNext;
    this.hasPrevious = b.hasPrevious;
    this.remote = b.remote;
    this.receivedAtMs = b.receivedAtMs;
  }

  /**
   * Whether the car should show the "start playback on the phone" message
   * instead of a track.
   *
   * <p>That is the case when there is no local track, and also while the phone
   * is remote-controlling another device, because the local player signals
   * still hold the remote device's track then.
   *
   * @return true when the message should show
   */
  public boolean showMessage() {
    return !hasTrack || remote;
  }

  /**
   * The playback position at a given moment.
   *
   * <p>Advances from the last push while playing, holds still while paused or
   * buffering, and never runs past the end of the track.
   *
   * @param nowMs the current time, in the same clock as {@link #receivedAtMs}
   * @return the position in milliseconds
   */
  public long positionAt(long nowMs) {
    if (!isPlaying || buffering) {
      return positionMs;
    }

    long advanced = positionMs + Math.max(0, nowMs - receivedAtMs);

    return durationMs > 0 ? Math.min(advanced, durationMs) : advanced;
  }

  /**
   * A copy of this snapshot stamped with its arrival time.
   *
   * @param receivedAtMs the arrival time
   * @return the stamped copy
   */
  public MirrorState withReceivedAt(long receivedAtMs) {
    return new Builder(this).receivedAtMs(receivedAtMs).build();
  }

  /** Builds {@link MirrorState} values; every field defaults to "nothing". */
  public static final class Builder {

    private boolean hasTrack;
    private String trackId = "";
    private String title = "";
    private String artist = "";
    private String album = "";
    private long durationMs;
    private String artBase64;
    private boolean isPlaying;
    private boolean buffering;
    private long positionMs;
    private boolean hasNext;
    private boolean hasPrevious;
    private boolean remote;
    private long receivedAtMs;

    public Builder() {}

    private Builder(MirrorState s) {
      hasTrack = s.hasTrack;
      trackId = s.trackId;
      title = s.title;
      artist = s.artist;
      album = s.album;
      durationMs = s.durationMs;
      artBase64 = s.artBase64;
      isPlaying = s.isPlaying;
      buffering = s.buffering;
      positionMs = s.positionMs;
      hasNext = s.hasNext;
      hasPrevious = s.hasPrevious;
      remote = s.remote;
      receivedAtMs = s.receivedAtMs;
    }

    public Builder track(String id, String title, String artist, String album, long durationMs) {
      this.hasTrack = true;
      this.trackId = id;
      this.title = title;
      this.artist = artist;
      this.album = album;
      this.durationMs = durationMs;
      return this;
    }

    public Builder art(String artBase64) {
      this.artBase64 = artBase64;
      return this;
    }

    public Builder playback(boolean isPlaying, boolean buffering, long positionMs) {
      this.isPlaying = isPlaying;
      this.buffering = buffering;
      this.positionMs = positionMs;
      return this;
    }

    public Builder queue(boolean hasNext, boolean hasPrevious) {
      this.hasNext = hasNext;
      this.hasPrevious = hasPrevious;
      return this;
    }

    public Builder remote(boolean remote) {
      this.remote = remote;
      return this;
    }

    private Builder receivedAtMs(long receivedAtMs) {
      this.receivedAtMs = receivedAtMs;
      return this;
    }

    public MirrorState build() {
      return new MirrorState(this);
    }
  }
}
