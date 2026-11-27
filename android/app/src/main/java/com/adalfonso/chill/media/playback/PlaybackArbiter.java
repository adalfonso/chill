package com.adalfonso.chill.media.playback;

/**
 * Decides who the car talks to while the web page and the native player can both play: the
 * mirror of the page, or the native player. Whichever starts second pauses the first. Only the
 * page starting counts, not a repeat report of it playing, so a report that was already on its
 * way when the native player started cannot hand the session straight back.
 */
public final class PlaybackArbiter {

  /** The two things the session can be showing. */
  public enum Side {
    MIRROR,
    NATIVE
  }

  /** What the arbiter drives. */
  public interface Handoff {
    /** Points the media session at the given side. */
    void use(Side side);

    /** Tells the web page to pause. */
    void pauseWebView();

    /** Pauses the native player. */
    void pauseNative();
  }

  private final Handoff handoff;
  private Side active = Side.MIRROR;
  private boolean webViewPlaying;

  /**
   * @param handoff what to call when the active side changes
   */
  public PlaybackArbiter(Handoff handoff) {
    this.handoff = handoff;
  }

  /** @return the side the session is showing */
  public Side active() {
    return active;
  }

  /** The native player began playing: take the session and quiet the page. */
  public void onNativeStarted() {
    if (active == Side.NATIVE) {
      return;
    }

    active = Side.NATIVE;
    handoff.use(Side.NATIVE);
    handoff.pauseWebView();
  }

  /**
   * The page reported its state. When it has just started playing while the native player has the
   * session, the native player is paused and the session goes back to the mirror.
   *
   * @param playing whether the page says it is playing
   */
  public void onWebViewState(boolean playing) {
    boolean started = playing && !webViewPlaying;

    webViewPlaying = playing;

    if (started && active == Side.NATIVE) {
      active = Side.MIRROR;
      handoff.pauseNative();
      handoff.use(Side.MIRROR);
    }
  }
}
