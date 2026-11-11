package com.adalfonso.chill.media;

/**
 * A snapshot of the web player as the page last reported it: what is playing,
 * whether it is playing, and where. Immutable. The media service only mirrors it;
 * the web player is the only source of truth. Between snapshots the position is
 * worked out from when the last one arrived.
 */
public final class MirrorState {

  /** Nothing playing; also the state after a sign-out. */
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

  /** Copies the builder's values. */
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
   * Whether the car should show its "start playback on the phone" message: nothing is playing here,
   * or the phone is remote-controlling another device.
   */
  public boolean showMessage() {
    return !hasTrack || remote;
  }

  /**
   * Where playback is at a given time: advances from the snapshot while playing, holds when paused
   * or buffering, and never passes the end.
   */
  public long positionAt(long nowMs) {
    if (!isPlaying || buffering) {
      return positionMs;
    }

    long advanced = positionMs + Math.max(0, nowMs - receivedAtMs);

    return durationMs > 0 ? Math.min(advanced, durationMs) : advanced;
  }

  /** A copy that notes when the snapshot arrived. */
  public MirrorState withReceivedAt(long receivedAtMs) {
    return new Builder(this).receivedAtMs(receivedAtMs).build();
  }

  /** Builds a {@link MirrorState}; every field starts as "nothing". */
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

    /** Starts with nothing set. */
    public Builder() {}

    /** Starts from an existing state. */
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

    /** Sets the current track, and marks that there is one. */
    public Builder track(String id, String title, String artist, String album, long durationMs) {
      this.hasTrack = true;
      this.trackId = id;
      this.title = title;
      this.artist = artist;
      this.album = album;
      this.durationMs = durationMs;
      return this;
    }

    /** Sets the cover, as base64 JPEG; null for none. */
    public Builder art(String artBase64) {
      this.artBase64 = artBase64;
      return this;
    }

    /** Sets whether it is playing, whether it is stalled, and the position. */
    public Builder playback(boolean isPlaying, boolean buffering, long positionMs) {
      this.isPlaying = isPlaying;
      this.buffering = buffering;
      this.positionMs = positionMs;
      return this;
    }

    /** Sets whether the queue has a next and a previous track. */
    public Builder queue(boolean hasNext, boolean hasPrevious) {
      this.hasNext = hasNext;
      this.hasPrevious = hasPrevious;
      return this;
    }

    /** Sets whether the phone is remote-controlling another Chill device. */
    public Builder remote(boolean remote) {
      this.remote = remote;
      return this;
    }

    /** Sets when the snapshot arrived. */
    private Builder receivedAtMs(long receivedAtMs) {
      this.receivedAtMs = receivedAtMs;
      return this;
    }

    /** Creates the finished, unchangeable state. */
    public MirrorState build() {
      return new MirrorState(this);
    }
  }
}
