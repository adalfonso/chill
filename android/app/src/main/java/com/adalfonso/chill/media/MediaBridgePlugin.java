package com.adalfonso.chill.media;

import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONException;

/**
 * The Capacitor plugin the WebView uses to talk to the media service.
 *
 * <p>The WebView pushes its player state with {@code publishState}, and car
 * commands come back as {@code command} events. Navigating to the login page
 * clears the car view. The plugin holds no state itself: it attaches to the
 * {@link MediaBridgeHub}, which outlives the Activity.
 */
@CapacitorPlugin(name = "MediaBridge")
public final class MediaBridgePlugin extends Plugin {

  private static final String LOGIN_PATH = "/auth/login";

  /**
   * Attach to the hub when the plugin loads, so car commands reach the WebView.
   *
   * <p>Capacitor calls this once the bridge is up. The command sink is replaced
   * if an earlier plugin instance left one behind.
   */
  @Override
  public void load() {
    MediaBridgeHub.instance().setCommandSink(this::deliverCommand);
  }

  /**
   * Receive a snapshot of the WebView player and hand it to the hub.
   *
   * <p>Rejects the call when the snapshot is malformed, so the WebView sees the
   * failure instead of the car silently keeping the previous track.
   *
   * @param call the plugin call carrying the snapshot as its data
   */
  @PluginMethod
  public void publishState(PluginCall call) {
    try {
      MediaBridgeHub.instance().publish(MirrorStateParser.parse(call.getData()));
      call.resolve();
    } catch (JSONException e) {
      call.reject("Invalid media state: " + e.getMessage());
    }
  }

  /**
   * Clears the car view when the WebView navigates to the login page, so a
   * signed-out phone does not keep showing the last track.
   */
  @Override
  public Boolean shouldOverrideLoad(Uri url) {
    if (isLoginPath(url.getPath())) {
      MediaBridgeHub.instance().clear();
    }

    // Never take over the navigation itself
    return null;
  }

  /**
   * Whether a navigation path is the login page.
   *
   * <p>The WebView lands there after a sign-out and after a dead session. A longer
   * path that only starts with the same letters, such as {@code /auth/login-help},
   * is not the login page.
   *
   * @param path the path of the page being loaded, or null when there is none
   * @return true when the path is the login page or below it
   */
  static boolean isLoginPath(String path) {
    return path != null && (path.equals(LOGIN_PATH) || path.startsWith(LOGIN_PATH + "/"));
  }

  /**
   * Drop the state and the command sink when the Activity is destroyed, so the
   * car does not keep showing a track nobody is playing.
   */
  @Override
  protected void handleOnDestroy() {
    MediaBridgeHub.instance().teardown();
  }

  /**
   * Send a car command to the WebView as a {@code command} event.
   *
   * <p>Only a seek carries a position.
   *
   * @param command the command from the car
   */
  private void deliverCommand(MirrorCommand command) {
    JSObject data = new JSObject();
    data.put("action", command.action().wireName());

    if (command.action() == MirrorCommand.Action.SEEK) {
      data.put("position_s", command.positionSeconds());
    }

    notifyListeners("command", data);
  }
}
