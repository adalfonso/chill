package com.adalfonso.chill.media;

import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONException;

/**
 * The doorway between the web page and Java (a Capacitor "plugin", called
 * {@code MediaBridge} in the web code). The page sends its player state in with
 * {@link #publishState}, and car button presses go back out as {@code command}
 * events. It keeps no state itself; that lives in the {@link MediaBridgeHub}.
 */
@CapacitorPlugin(name = "MediaBridge")
public final class MediaBridgePlugin extends Plugin {

  private static final String LOGIN_PATH = "/auth/login";

  /** Tells the hub to send car commands to this plugin. */
  @Override
  public void load() {
    MediaBridgeHub.instance().setCommandSink(this::deliverCommand);
  }

  /** Called from JavaScript: stores the web player's state so the car can show it. */
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
   * Runs before each page load and reports it to {@link #applyNavigation}. Returns null: it
   * never takes over a navigation.
   */
  @Override
  public Boolean shouldOverrideLoad(Uri url) {
    applyNavigation(MediaBridgeHub.instance(), url.getPath());

    return null;
  }

  /**
   * Reacts to a page load: the login page means the user signed out, so the car view is cleared
   * and late pushes from the old page are ignored; any other page lifts that block.
   */
  static void applyNavigation(MediaBridgeHub hub, String path) {
    if (isLoginPath(path)) {
      hub.markSignedOut();
    } else {
      hub.markSignedIn();
    }
  }

  /** Whether a page path is the login page; {@code /auth/login-help} is not. */
  static boolean isLoginPath(String path) {
    return path != null && (path.equals(LOGIN_PATH) || path.startsWith(LOGIN_PATH + "/"));
  }

  /** Runs when the screen is destroyed; the car stops showing a track nobody plays. */
  @Override
  protected void handleOnDestroy() {
    MediaBridgeHub.instance().teardown();
  }

  /** Forwards a car command to the web page as a {@code command} event. */
  private void deliverCommand(MirrorCommand command) {
    notifyListeners("command", commandPayload(command));
  }

  /** What the web page receives for a command: its action name, plus a position for a seek. */
  static JSObject commandPayload(MirrorCommand command) {
    JSObject data = new JSObject();
    data.put("action", command.action().wireName());

    if (command.action() == MirrorCommand.Action.SEEK) {
      data.put("position_s", command.positionSeconds());
    }

    return data;
  }
}
