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
import androidx.media3.session.MediaLibraryService;
import androidx.media3.session.MediaBrowser;
import androidx.media3.session.SessionToken;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.google.common.collect.ImmutableList;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
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

  /** Connect with a listener, so the test can see "reload the list" notifications. */
  private void connectCounting(AtomicInteger changes) throws Exception {
    SessionToken token = new SessionToken(context, new ComponentName(context, ChillMediaService.class));
    AtomicReference<com.google.common.util.concurrent.ListenableFuture<MediaBrowser>> future =
        new AtomicReference<>();
    MediaBrowser.Listener listener =
        new MediaBrowser.Listener() {
          @Override
          public void onChildrenChanged(
              MediaBrowser b, String parentId, int itemCount, MediaLibraryService.LibraryParams params) {
            changes.incrementAndGet();
          }
        };

    onMain(() -> future.set(new MediaBrowser.Builder(context, token).setListener(listener).buildAsync()));
    browser = future.get().get(15, TimeUnit.SECONDS);
  }

  private String rootChildTitle() throws Exception {
    LibraryResult<ImmutableList<MediaItem>> children =
        onMain(() -> browser.getChildren("chill-root", 0, 10, null)).get(10, TimeUnit.SECONDS);

    return children.value.get(0).mediaMetadata.title.toString();
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
  public void the_browse_list_follows_the_phone_and_tells_the_car_to_reload() throws Exception {
    AtomicInteger changes = new AtomicInteger();
    connectCounting(changes);
    onMain(() -> browser.subscribe("chill-root", null));
    String message = context.getString(com.adalfonso.chill.R.string.car_start_on_phone);
    assertEquals(message, rootChildTitle());

    // The phone becomes ready: the message must give way to the track on its own
    hub.publish(playingTrack());
    waitFor(() -> changes.get() >= 1);
    assertEquals("Test Song", rootChildTitle());

    // The phone signs out: back to the message
    int before = changes.get();
    hub.clear();
    waitFor(() -> changes.get() > before);
    assertEquals(message, rootChildTitle());
  }

  @Test
  public void position_only_updates_do_not_reload_the_browse_list() throws Exception {
    hub.publish(playingTrack());
    AtomicInteger changes = new AtomicInteger();
    connectCounting(changes);
    onMain(() -> browser.subscribe("chill-root", null));
    waitFor(() -> browser.getCurrentMediaItem() != null);
    int before = changes.get();

    hub.publish(
        new MirrorState.Builder()
            .track("7", "Test Song", "Test Artist", "Test Album", 200_000)
            .playback(true, false, 90_000)
            .queue(true, true)
            .build());
    Thread.sleep(800);

    assertEquals(before, changes.get());
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
  public void previous_item_from_the_car_becomes_a_previous_command() throws Exception {
    hub.publish(playingTrack());
    connect();
    waitFor(() -> browser.getCurrentMediaItem() != null);

    onMain(() -> browser.seekToPreviousMediaItem());
    waitFor(() -> !commands.isEmpty());

    assertEquals(MirrorCommand.PREVIOUS, commands.get(0).action);
  }

  @Test
  public void previous_after_the_first_seconds_restarts_the_track_instead() throws Exception {
    // The default controller rule: past a few seconds in, previous restarts the
    // current track. The mirror must turn that into a seek, not a track change.
    hub.publish(playingTrack());
    connect();
    waitFor(() -> browser.getCurrentMediaItem() != null);

    onMain(() -> browser.seekToPrevious());
    waitFor(() -> !commands.isEmpty());

    assertEquals(MirrorCommand.SEEK, commands.get(0).action);
    assertEquals(0.0, commands.get(0).positionSeconds, 0.001);
  }

  @Test
  public void remote_control_shows_the_message_even_with_a_local_track() throws Exception {
    hub.publish(
        new MirrorState.Builder()
            .track("7", "Remote Song", "A", "B", 100_000)
            .playback(true, false, 0)
            .remote(true)
            .build());
    connect();

    LibraryResult<ImmutableList<MediaItem>> children =
        onMain(() -> browser.getChildren("chill-root", 0, 10, null)).get(10, TimeUnit.SECONDS);

    assertNull(onMain(() -> browser.getCurrentMediaItem()));
    assertEquals(1, children.value.size());
  }

  @Test
  public void a_stalled_stream_is_reported_as_buffering() throws Exception {
    hub.publish(
        new MirrorState.Builder()
            .track("7", "Song", "A", "B", 100_000)
            .playback(true, true, 5_000)
            .build());
    connect();
    waitFor(() -> browser.getCurrentMediaItem() != null);

    assertEquals(Player.STATE_BUFFERING, (int) onMain(() -> browser.getPlaybackState()));
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
    assertNull(onMain(() -> browser.getCurrentMediaItem()));
  }
}
