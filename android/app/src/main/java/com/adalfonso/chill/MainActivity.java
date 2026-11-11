package com.adalfonso.chill;

import android.os.Bundle;
import com.adalfonso.chill.media.MediaBridgePlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    // Custom plugins must be registered before the base class creates the bridge
    registerPlugin(MediaBridgePlugin.class);
    super.onCreate(savedInstanceState);
  }
}
