package com.adalfonso.chill;

import android.Manifest;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.adalfonso.chill.media.MediaBridgePlugin;
import com.getcapacitor.BridgeActivity;

/**
 * The app's only screen (an Android "Activity"): a WebView, which is an embedded
 * browser, showing the web UI. It adds the media plugin and asks, once, to show the
 * playback notification.
 */
public class MainActivity extends BridgeActivity {

  private static final String PREFS = "chill";
  private static final String ASKED_NOTIFICATIONS = "asked_notifications";

  /**
   * Registers the media plugin so the web page can call it, before Capacitor starts, then asks
   * for the notification permission if it has not been asked before.
   */
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(MediaBridgePlugin.class);
    super.onCreate(savedInstanceState);
    askForNotificationsOnce();
  }

  /**
   * Asks to show notifications the first time the app opens (Android 13 and later). Without it
   * playback still works but its notification is hidden; asking again would only nag.
   */
  private void askForNotificationsOnce() {
    SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);

    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
        || prefs.getBoolean(ASKED_NOTIFICATIONS, false)
        || ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
            == PackageManager.PERMISSION_GRANTED) {
      return;
    }

    prefs.edit().putBoolean(ASKED_NOTIFICATIONS, true).apply();
    ActivityCompat.requestPermissions(
        this, new String[] {Manifest.permission.POST_NOTIFICATIONS}, 0);
  }
}
