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

  private static final String LOGIN_PATH_PREFIX = "/auth/login";

  @Override
  public void load() {
    MediaBridgeHub.instance().setCommandSink(this::deliverCommand);
  }

  @PluginMethod
  public void publishState(PluginCall call) {
    try {
      MediaBridgeHub.instance().publish(MirrorStateParser.parse(call.getData()));
      call.resolve();
    } catch (JSONException e) {
      call.reject("Invalid media state: " + e.getMessage());
    }
  }

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
    String path = url.getPath();

    if (path != null && path.startsWith(LOGIN_PATH_PREFIX)) {
      MediaBridgeHub.instance().clear();
    }

    // Never take over the navigation itself
    return null;
  }

  /** Drops the state and the command sink when the Activity is destroyed. */
  @Override
  protected void handleOnDestroy() {
    MediaBridgeHub.instance().teardown();
  }

  private void deliverCommand(MirrorCommand command) {
    JSObject data = new JSObject();
    data.put("action", command.action);

    if (MirrorCommand.SEEK.equals(command.action)) {
      data.put("position_s", command.positionSeconds);
    }

    notifyListeners("command", data);
  }
}
