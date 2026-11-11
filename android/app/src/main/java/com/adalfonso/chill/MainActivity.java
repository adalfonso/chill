package com.adalfonso.chill;

import android.os.Bundle;
import com.adalfonso.chill.media.MediaBridgePlugin;
import com.getcapacitor.BridgeActivity;

/** The app's single Activity: a Capacitor bridge with the media plugin added. */
public class MainActivity extends BridgeActivity {

  /**
   * Register the media plugin, then let Capacitor build the bridge.
   *
   * @param savedInstanceState the saved state, passed through to Capacitor
   */
  @Override
  public void onCreate(Bundle savedInstanceState) {
    // Custom plugins must be registered before the base class creates the bridge
    registerPlugin(MediaBridgePlugin.class);
    super.onCreate(savedInstanceState);
  }
}
