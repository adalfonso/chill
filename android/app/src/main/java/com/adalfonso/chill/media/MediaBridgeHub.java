package com.adalfonso.chill.media;

import android.os.Handler;
import android.os.Looper;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executor;
import java.util.function.LongSupplier;

/**
 * The process-wide meeting point between the WebView plugin and the media
 * service.
 *
 * <p>The media service can start with no Activity, and a Capacitor plugin only
 * exists while the bridge is alive, so neither can hold the other directly.
 * The hub holds the latest pushed state and the command sink, and each side
 * attaches to it when it starts.
 *
 * <p>It has no Android dependencies, so it is covered by plain JVM unit tests.
 */
public final class MediaBridgeHub {

  /** Told, on the listener executor, when the state changes. */
  public interface StateListener {
    void onStateChanged();
  }

  /** Receives commands from the car and delivers them to the WebView. */
  public interface CommandSink {
    void send(MirrorCommand command);
  }

  private final LongSupplier clock;
  private final Executor listenerExecutor;
  private final CopyOnWriteArrayList<StateListener> listeners = new CopyOnWriteArrayList<>();
  private volatile MirrorState state = MirrorState.EMPTY;
  private volatile CommandSink commandSink;

  /**
   * @param clock the time source used to stamp pushed states
   * @param listenerExecutor where state listeners run; the main looper in the app, so
   *     listeners never have to hop threads themselves
   */
  public MediaBridgeHub(LongSupplier clock, Executor listenerExecutor) {
    this.clock = clock;
    this.listenerExecutor = listenerExecutor;
  }

  /** Holds the shared hub, created on first use so unit tests never touch Android. */
  private static final class Shared {
    static final MediaBridgeHub HUB =
        new MediaBridgeHub(
            System::currentTimeMillis, new Handler(Looper.getMainLooper())::post);
  }

  /**
   * @return the shared hub for this process
   */
  public static MediaBridgeHub instance() {
    return Shared.HUB;
  }

  /**
   * @return the latest pushed state, or {@link MirrorState#EMPTY}
   */
  public MirrorState state() {
    return state;
  }

  /**
   * @return the current time in the clock used to stamp pushed states
   */
  public long now() {
    return clock.getAsLong();
  }

  /**
   * Replace the state with a newly pushed one, stamping its arrival time.
   *
   * @param incoming the snapshot from the WebView
   */
  public void publish(MirrorState incoming) {
    state = incoming.withReceivedAt(clock.getAsLong());
    notifyListeners();
  }

  /** Forget the current playback, so the car shows the message again. */
  public void clear() {
    state = MirrorState.EMPTY;
    notifyListeners();
  }

  /**
   * Forget the playback and detach the command sink.
   *
   * <p>Called when the Activity or WebView is destroyed while the process lives,
   * so the car does not keep showing a track nobody is playing and commands do
   * not go to a listener that no longer exists.
   */
  public void teardown() {
    commandSink = null;
    clear();
  }

  /**
   * Deliver a car command to the WebView.
   *
   * @param command the command from the car
   * @return false when no WebView is attached and the command was dropped
   */
  public boolean sendCommand(MirrorCommand command) {
    CommandSink sink = commandSink;

    if (sink == null) {
      return false;
    }

    sink.send(command);

    return true;
  }

  /**
   * @param sink where commands go, or null to detach
   */
  public void setCommandSink(CommandSink sink) {
    commandSink = sink;
  }

  /**
   * @param listener told on every state change
   */
  public void addStateListener(StateListener listener) {
    listeners.add(listener);
  }

  /**
   * @param listener the listener to stop notifying
   */
  public void removeStateListener(StateListener listener) {
    listeners.remove(listener);
  }

  /** Tell every state listener that the state changed. */
  private void notifyListeners() {
    listenerExecutor.execute(() -> listeners.forEach(StateListener::onStateChanged));
  }
}
