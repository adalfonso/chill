package com.adalfonso.chill.media;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import android.content.ComponentName;
import android.content.Context;
import androidx.media3.common.MediaItem;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.session.LibraryResult;
import androidx.media3.session.MediaBrowser;
import androidx.media3.session.SessionToken;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.google.common.collect.ImmutableList;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Drives the real media service through a real media3 controller, the way
 * Android Auto does: connect, read the session, send transport commands.
 *
 * <p>The test runs in the app's own process, so the controller is allowed by
 * {@link CallerAllowlist} and shares the {@link MediaBridgeHub} with the
 * service.
 */
@UnstableApi
@RunWith(AndroidJUnit4.class)
public class ChillMediaServiceTest {

  private final Context context = ApplicationProvider.getApplicationContext();
  private final MediaBridgeHub hub = MediaBridgeHub.instance();
  private final CopyOnWriteArrayList<MirrorCommand> commands = new CopyOnWriteArrayList<>();
  private MediaBrowser browser;

  @Before
  public void setUp() {
    hub.clear();
    hub.setCommandSink(commands::add);
  }

  @After
  public void tearDown() throws Exception {
    if (browser != null) {
      onMain(() -> browser.release());
    }

    hub.teardown();
  }

  private static void onMain(Runnable runnable) {
    InstrumentationRegistry.getInstrumentation().runOnMainSync(runnable);
  }

  private static <T> T onMain(java.util.concurrent.Callable<T> callable) throws Exception {
    AtomicReference<T> result = new AtomicReference<>();
    AtomicReference<Exception> error = new AtomicReference<>();

    onMain(
        () -> {
          try {
            result.set(callable.call());
          } catch (Exception e) {
            error.set(e);
          }
        });

    if (error.get() != null) {
      throw error.get();
    }

    return result.get();
  }

  private void connect() throws Exception {
    SessionToken token = new SessionToken(context, new ComponentName(context, ChillMediaService.class));
    AtomicReference<com.google.common.util.concurrent.ListenableFuture<MediaBrowser>> future =
        new AtomicReference<>();

    onMain(() -> future.set(new MediaBrowser.Builder(context, token).buildAsync()));
    browser = future.get().get(15, TimeUnit.SECONDS);
  }

  private static MirrorState playingTrack() {
    return new MirrorState.Builder()
        .track("7", "Test Song", "Test Artist", "Test Album", 200_000)
        .playback(true, false, 10_000)
        .queue(true, true)
        .build();
  }

  private void waitFor(java.util.function.BooleanSupplier condition) throws Exception {
    long deadline = System.currentTimeMillis() + 10_000;

    while (System.currentTimeMillis() < deadline) {
      if (onMain(condition::getAsBoolean)) {
        return;
      }

      Thread.sleep(50);
    }

    throw new AssertionError("Condition not met within 10 seconds");
  }

  @Test
  public void with_nothing_pushed_the_browse_root_holds_only_the_message() throws Exception {
    connect();

    LibraryResult<MediaItem> root = onMain(() -> browser.getLibraryRoot(null)).get(10, TimeUnit.SECONDS);
    assertEquals(LibraryResult.RESULT_SUCCESS, root.resultCode);

    LibraryResult<ImmutableList<MediaItem>> children =
        onMain(() -> browser.getChildren(root.value.mediaId, 0, 10, null)).get(10, TimeUnit.SECONDS);

    assertEquals(1, children.value.size());
    assertEquals(
        context.getString(com.adalfonso.chill.R.string.car_start_on_phone),
        children.value.get(0).mediaMetadata.title.toString());
  }

  @Test
  public void a_pushed_track_shows_in_the_session() throws Exception {
    hub.publish(playingTrack());
    connect();

    waitFor(() -> browser.getCurrentMediaItem() != null);

    assertEquals("Test Song", onMain(() -> browser.getMediaMetadata().title.toString()));
    assertEquals("Test Artist", onMain(() -> browser.getMediaMetadata().artist.toString()));
    assertTrue(onMain(() -> browser.isPlaying()));
    assertEquals(200_000L, (long) onMain(() -> browser.getDuration()));
  }

  @Test
  public void malformed_art_is_ignored_and_does_not_crash_the_session() throws Exception {
    hub.publish(
        new MirrorState.Builder()
            .track("7", "Test Song", "Test Artist", "Test Album", 200_000)
            .art("!!! not base64 !!!")
            .playback(true, false, 0)
            .build());
    connect();

    waitFor(() -> browser.getCurrentMediaItem() != null);

    assertEquals("Test Song", onMain(() -> browser.getMediaMetadata().title.toString()));
  }

  @Test
  public void valid_art_reaches_the_session_metadata() throws Exception {
    hub.publish(
        new MirrorState.Builder()
            .track("7", "Test Song", "Test Artist", "Test Album", 200_000)
            .art("QUJDRA==")
            .playback(true, false, 0)
            .build());
    connect();

    waitFor(() -> browser.getCurrentMediaItem() != null);

    assertNotNull(onMain(() -> browser.getMediaMetadata().artworkData));
  }

  @Test
  public void position_advances_while_playing_and_holds_while_paused() throws Exception {
    hub.publish(playingTrack());
    connect();
    waitFor(() -> browser.getCurrentMediaItem() != null);

    long first = onMain(() -> browser.getCurrentPosition());
    Thread.sleep(1_200);
    long second = onMain(() -> browser.getCurrentPosition());

    assertTrue("position should advance while playing", second > first);

    hub.publish(new MirrorState.Builder().track("7", "Test Song", "Test Artist", "Test Album", 200_000)
        .playback(false, false, 50_000).build());
    waitFor(() -> !browser.isPlaying());
    long paused_a = onMain(() -> browser.getCurrentPosition());
    Thread.sleep(1_000);
    long paused_b = onMain(() -> browser.getCurrentPosition());

    assertEquals(paused_a, paused_b);
  }

  @Test
  public void pause_from_the_car_goes_to_the_webview_and_does_not_change_state() throws Exception {
    hub.publish(playingTrack());
    connect();
    waitFor(() -> browser.getCurrentMediaItem() != null);

    onMain(() -> browser.pause());
    waitFor(() -> !commands.isEmpty());

    assertEquals(MirrorCommand.PAUSE, commands.get(0).action);
    // The WebView is the source of truth: until it pushes, the car still says playing
    Thread.sleep(300);
    assertTrue(onMain(() -> browser.isPlaying()));
  }

  @Test
  public void next_and_a_seek_from_the_car_become_commands() throws Exception {
    hub.publish(playingTrack());
    connect();
    waitFor(() -> browser.getCurrentMediaItem() != null);

    onMain(() -> browser.seekToNext());
    waitFor(() -> commands.size() >= 1);
    assertEquals(MirrorCommand.NEXT, commands.get(0).action);

    onMain(() -> browser.seekTo(30_000));
    waitFor(() -> commands.size() >= 2);
    assertEquals(MirrorCommand.SEEK, commands.get(1).action);
    assertEquals(30.0, commands.get(1).positionSeconds, 0.001);
  }

  @Test
  public void a_single_track_queue_reports_next_and_previous_unavailable() throws Exception {
    hub.publish(
        new MirrorState.Builder()
            .track("7", "Only", "A", "B", 100_000)
            .playback(true, false, 0)
            .queue(false, false)
            .build());
    connect();
    waitFor(() -> browser.getCurrentMediaItem() != null);

    assertFalse(onMain(() -> browser.isCommandAvailable(Player.COMMAND_SEEK_TO_NEXT)));
    assertFalse(onMain(() -> browser.isCommandAvailable(Player.COMMAND_SEEK_TO_PREVIOUS)));
    assertTrue(onMain(() -> browser.isCommandAvailable(Player.COMMAND_SEEK_IN_CURRENT_MEDIA_ITEM)));
  }

  @Test
  public void clearing_the_state_drops_the_track_from_the_session() throws Exception {
    hub.publish(playingTrack());
    connect();
    waitFor(() -> browser.getCurrentMediaItem() != null);

    hub.clear();
    waitFor(() -> browser.getCurrentMediaItem() == null);

    assertNull(onMain(() -> browser.getCurrentMediaItem()));
  }

  @Test
  public void teardown_drops_the_track_and_later_commands() throws Exception {
    hub.publish(playingTrack());
    connect();
    waitFor(() -> browser.getCurrentMediaItem() != null);

    hub.teardown();
    waitFor(() -> browser.getCurrentMediaItem() == null);

    assertFalse(hub.sendCommand(MirrorCommand.of(MirrorCommand.PLAY)));
    assertNotNull(browser);
  }
}
