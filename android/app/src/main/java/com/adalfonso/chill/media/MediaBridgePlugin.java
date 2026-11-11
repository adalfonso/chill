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
 * <p>The WebView pushes its player state with {@code publishState} and clears
 * it with {@code clearState}; car commands come back as {@code command}
 * events. The plugin holds no state itself: it attaches to the
 * {@link MediaBridgeHub}, which outlives the Activity.
 */
@CapacitorPlugin(name = "MediaBridge")
public final class MediaBridgePlugin extends Plugin {

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
   * Forget the current playback so the car shows the message again.
   *
   * @param call the plugin call to resolve
   */
  @PluginMethod
  public void clearState(PluginCall call) {
    MediaBridgeHub.instance().clear();
    call.resolve();
  }

  /**
   * Clears the car view when the WebView navigates to the login page, so a
   * signed-out phone does not keep showing the last track.
   */
  @Override
  public Boolean shouldOverrideLoad(Uri url) {
    if (NavigationPolicy.isLoginPath(url.getPath())) {
      MediaBridgeHub.instance().clear();
    }

    // Never take over the navigation itself
    return null;
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
    data.put("action", command.action);

    if (MirrorCommand.SEEK.equals(command.action)) {
      data.put("position_s", command.positionSeconds);
    }

    notifyListeners("command", data);
  }
}
