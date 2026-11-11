package com.adalfonso.chill;

import android.os.Bundle;
import com.adalfonso.chill.media.MediaBridgePlugin;
import com.getcapacitor.BridgeActivity;

/**
 * The app's only screen (an Android "Activity"): a WebView, which is an embedded
 * browser, showing the web UI. The one thing added here is the media plugin.
 */
public class MainActivity extends BridgeActivity {

  /** Registers the media plugin so the web page can call it, before Capacitor starts. */
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(MediaBridgePlugin.class);
    super.onCreate(savedInstanceState);
  }
}
