package com.adalfonso.chill.media;

import android.os.Handler;
import android.os.Looper;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executor;
import java.util.function.LongSupplier;

/**
 * The shared notice board between the plugin and the media service. It holds the
 * latest player state and where to send car commands. The service can outlive the
 * screen (and so the plugin), so neither can hold the other directly; both use the
 * hub instead. Listener callbacks run on the main thread, where Android wants
 * media code to run.
 */
public final class MediaBridgeHub {

  /** Told whenever the state changes. */
  public interface StateListener {
    void onStateChanged();
  }

  /** Where car commands go; the plugin, which passes them on to the web page. */
  public interface CommandSink {
    void send(MirrorCommand command);
  }

  private final LongSupplier clock;
  private final Executor listenerExecutor;
  private final CopyOnWriteArrayList<StateListener> listeners = new CopyOnWriteArrayList<>();
  private volatile MirrorState state = MirrorState.EMPTY;
  private volatile CommandSink commandSink;

  /** Creates a hub; tests pass their own clock and run listeners inline. */
  public MediaBridgeHub(LongSupplier clock, Executor listenerExecutor) {
    this.clock = clock;
    this.listenerExecutor = listenerExecutor;
  }

  /** Creates the shared hub on first use, so JVM unit tests never touch Android. */
  private static final class Shared {
    static final MediaBridgeHub HUB =
        new MediaBridgeHub(
            System::currentTimeMillis, new Handler(Looper.getMainLooper())::post);
  }

  /** The one hub the whole app shares. */
  public static MediaBridgeHub instance() {
    return Shared.HUB;
  }

  /** The latest state from the web page, or {@link MirrorState#EMPTY} if none. */
  public MirrorState state() {
    return state;
  }

  /** The current time, from the same clock used to stamp pushed states. */
  public long now() {
    return clock.getAsLong();
  }

  /** Stores a new state from the web page, noting when it arrived, and tells listeners. */
  public void publish(MirrorState incoming) {
    state = incoming.withReceivedAt(clock.getAsLong());
    notifyListeners();
  }

  /** Forgets the current playback, so the car shows its message again. */
  public void clear() {
    state = MirrorState.EMPTY;
    notifyListeners();
  }

  /** Clears the state and stops sending commands; used when the screen is destroyed. */
  public void teardown() {
    commandSink = null;
    clear();
  }

  /** Passes a car command on to the web page; false if no page is attached. */
  public boolean sendCommand(MirrorCommand command) {
    CommandSink sink = commandSink;

    if (sink == null) {
      return false;
    }

    sink.send(command);

    return true;
  }

  /** Sets where car commands go; null detaches. */
  public void setCommandSink(CommandSink sink) {
    commandSink = sink;
  }

  /** Registers someone to be told on every state change. */
  public void addStateListener(StateListener listener) {
    listeners.add(listener);
  }

  /** Stops telling a registered listener. */
  public void removeStateListener(StateListener listener) {
    listeners.remove(listener);
  }

  /** Tells every listener, on the main thread, that the state changed. */
  private void notifyListeners() {
    listenerExecutor.execute(() -> listeners.forEach(StateListener::onStateChanged));
  }
}
