package com.adalfonso.chill.media;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.content.ComponentName;
import android.content.Context;
import android.support.v4.media.MediaBrowserCompat;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaControllerCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import androidx.media3.common.util.UnstableApi;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Reads the media session the way Android Auto does: through the older
 * {@code MediaSessionCompat} view, not the media3 controller.
 *
 * <p>Android Auto draws its progress bar from the legacy metadata duration and
 * the legacy playback state's position, speed, and update time, so those are
 * what these tests check.
 */
@UnstableApi
@RunWith(AndroidJUnit4.class)
public class LegacySessionViewTest {

  private final Context context = ApplicationProvider.getApplicationContext();
  private final MediaBridgeHub hub = MediaBridgeHub.instance();
  private MediaBrowserCompat browser;
  private MediaControllerCompat controller;

  @Before
  public void setUp() {
    hub.clear();
  }

  @After
  public void tearDown() {
    if (browser != null) {
      InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> browser.disconnect());
    }

    hub.teardown();
  }

  private static MirrorState track(boolean playing, long positionMs) {
    return new MirrorState.Builder()
        .track("7", "Test Song", "Test Artist", "Test Album", 200_000)
        .playback(playing, false, positionMs)
        .queue(true, true)
        .build();
  }

  private void connect() throws Exception {
    CountDownLatch connected = new CountDownLatch(1);

    InstrumentationRegistry.getInstrumentation()
        .runOnMainSync(
            () -> {
              browser =
                  new MediaBrowserCompat(
                      context,
                      new ComponentName(context, ChillMediaService.class),
                      new MediaBrowserCompat.ConnectionCallback() {
                        @Override
                        public void onConnected() {
                          try {
                            controller = new MediaControllerCompat(context, browser.getSessionToken());
                          } catch (Exception e) {
                            throw new RuntimeException(e);
                          }

                          connected.countDown();
                        }
                      },
                      null);
              browser.connect();
            });

    assertTrue("legacy browser should connect", connected.await(15, TimeUnit.SECONDS));
  }

  private PlaybackStateCompat state() {
    return controller.getPlaybackState();
  }

  private void waitUntil(java.util.function.BooleanSupplier condition) throws Exception {
    long deadline = System.currentTimeMillis() + 10_000;

    while (System.currentTimeMillis() < deadline) {
      if (condition.getAsBoolean()) {
        return;
      }

      Thread.sleep(50);
    }

    throw new AssertionError("Condition not met within 10 seconds");
  }

  @Test
  public void metadata_carries_the_track_duration_the_progress_bar_needs() throws Exception {
    hub.publish(track(true, 10_000));
    connect();
    waitUntil(() -> controller.getMetadata() != null);

    MediaMetadataCompat metadata = controller.getMetadata();

    assertEquals("Test Song", metadata.getString(MediaMetadataCompat.METADATA_KEY_TITLE));
    assertEquals(200_000L, metadata.getLong(MediaMetadataCompat.METADATA_KEY_DURATION));
  }

  @Test
  public void playback_state_reports_a_moving_position_and_seek_support() throws Exception {
    hub.publish(track(true, 10_000));
    connect();
    waitUntil(() -> state() != null && state().getState() == PlaybackStateCompat.STATE_PLAYING);

    PlaybackStateCompat s = state();

    assertEquals(1.0f, s.getPlaybackSpeed(), 0.001f);
    assertTrue("position should start near the pushed 10s", Math.abs(s.getPosition() - 10_000) < 2_000);
    assertTrue("seek should be offered", (s.getActions() & PlaybackStateCompat.ACTION_SEEK_TO) != 0);
    assertNotNull(s);
    assertTrue("update time should be set", s.getLastPositionUpdateTime() > 0);
  }

  @Test
  public void a_seek_on_the_phone_updates_the_legacy_position() throws Exception {
    hub.publish(track(true, 10_000));
    connect();
    waitUntil(() -> state() != null && state().getState() == PlaybackStateCompat.STATE_PLAYING);

    // The WebView pushes a new position after the phone's scrubber is dragged
    hub.publish(track(true, 150_000));
    waitUntil(() -> state() != null && Math.abs(state().getPosition() - 150_000) < 3_000);

    assertTrue(Math.abs(state().getPosition() - 150_000) < 3_000);
  }

  @Test
  public void pause_freezes_the_legacy_position() throws Exception {
    hub.publish(track(true, 10_000));
    connect();
    waitUntil(() -> state() != null && state().getState() == PlaybackStateCompat.STATE_PLAYING);

    hub.publish(track(false, 60_000));
    waitUntil(() -> state() != null && state().getState() == PlaybackStateCompat.STATE_PAUSED);

    assertEquals(0.0f, state().getPlaybackSpeed(), 0.001f);
    assertTrue(Math.abs(state().getPosition() - 60_000) < 1_500);
  }
}
