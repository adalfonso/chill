package com.adalfonso.chill.media;

import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.LibraryResult;
import androidx.media3.session.MediaLibraryService;
import androidx.media3.session.MediaSession;
import com.adalfonso.chill.R;
import com.adalfonso.chill.media.auth.AuthedHttp;
import com.adalfonso.chill.media.auth.HttpTransport;
import com.adalfonso.chill.media.auth.ServerConfig;
import com.adalfonso.chill.media.auth.SessionAuth;
import com.adalfonso.chill.media.auth.SignedOutException;
import com.adalfonso.chill.media.auth.WebViewCookieJar;
import com.adalfonso.chill.media.library.AuthedBitmapLoader;
import com.adalfonso.chill.media.library.LibraryClient;
import com.adalfonso.chill.media.library.LibraryTree;
import com.adalfonso.chill.media.library.Node;
import com.adalfonso.chill.media.playback.NativePlayback;
import com.adalfonso.chill.media.playback.NativePlayerFactory;
import com.adalfonso.chill.media.playback.PlaybackArbiter;
import com.adalfonso.chill.media.playback.QueueStore;
import com.google.common.collect.ImmutableList;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.common.util.concurrent.ListeningExecutorService;
import com.google.common.util.concurrent.MoreExecutors;
import java.io.File;
import java.io.IOException;
import java.util.List;
import java.util.concurrent.Executors;

/**
 * The media service Android Auto connects to (an Android "Service" is a background
 * component with no screen that other apps can connect to). It hosts the media session
 * and the car's browse tree of the library: Shuffle all, Playlists, Albums and Artists.
 * Choosing something plays it on the native player; until the phone's own player is moved
 * over, a page that starts playing takes the session back. Only apps on the
 * {@link CallerAllowlist} may connect.
 */
@UnstableApi
public final class ChillMediaService extends MediaLibraryService {

  /** Most entries returned for one page of a list; Android Auto shows only a limited number. */
  private static final int MAX_PAGE = 100;

  /** How many tracks "Shuffle all" queues. */
  private static final int SHUFFLE_COUNT = 50;

  private final MediaBridgeHub hub = MediaBridgeHub.instance();
  private final MediaBridgeHub.StateListener hubListener = this::onHubChanged;
  private final ListeningExecutorService network =
      MoreExecutors.listeningDecorator(Executors.newFixedThreadPool(2));
  private MirrorPlayer player;
  private MediaLibrarySession session;
  private ServerConfig server;
  private QueueStore queueStore;
  private NativePlayback nativePlayback;
  private PlaybackArbiter arbiter;
  private LibraryClient library;

  /** Creates the players and the media session, and starts watching the hub. */
  @Override
  public void onCreate() {
    super.onCreate();
    player = new MirrorPlayer(Looper.getMainLooper(), hub);

    server = ServerConfig.fromCapacitor(this);
    HttpTransport transport = new HttpTransport();
    SessionAuth auth = new SessionAuth(new WebViewCookieJar(), transport, server);
    AuthedHttp http = new AuthedHttp(auth, transport, server);
    library = new LibraryClient(http);
    // The no-backup folder keeps the queue out of Android's cloud backups
    queueStore = new QueueStore(new File(getNoBackupFilesDir(), "queue.json").toPath());
    auth.addSignedOutListener(this::onSignedOut);

    ExoPlayer exo = NativePlayerFactory.create(this, auth);
    nativePlayback =
        new NativePlayback(exo, auth, server, queueStore, () -> arbiter.onNativeStarted());
    arbiter = new PlaybackArbiter(new Handoff());

    session =
        new MediaLibrarySession.Builder(this, player, new LibraryCallback())
            .setBitmapLoader(new AuthedBitmapLoader(http, server))
            .build();
    hub.addStateListener(hubListener);
  }

  /** Hands Android the session when an app such as Android Auto connects. */
  @Nullable
  @Override
  public MediaLibrarySession onGetSession(MediaSession.ControllerInfo controllerInfo) {
    return session;
  }

  /** Stops watching the hub and releases the session and player. */
  @Override
  public void onDestroy() {
    hub.removeStateListener(hubListener);
    network.shutdown();
    session.release();
    nativePlayback.release();
    player.detach();
    player.release();
    super.onDestroy();
  }

  /** Lets the arbiter know when the web page starts playing. */
  private void onHubChanged() {
    arbiter.onWebViewState(hub.state().isPlaying);
  }

  /** The login is gone: forget the saved queue and stop the native player. */
  private void onSignedOut() {
    queueStore.delete();
    new Handler(Looper.getMainLooper()).post(() -> nativePlayback.player().clearMediaItems());
  }

  /** The top of the browse tree. */
  private MediaItem rootItem() {
    return browsableItem(LibraryTree.ROOT, getString(R.string.app_name));
  }

  private static MediaItem browsableItem(String id, String title) {
    return new MediaItem.Builder()
        .setMediaId(id)
        .setMediaMetadata(
            new MediaMetadata.Builder()
                .setIsBrowsable(true)
                .setIsPlayable(false)
                .setTitle(title)
                .build())
        .build();
  }

  /** The one entry shown when nobody is signed in. */
  private MediaItem signInItem() {
    return new MediaItem.Builder()
        .setMediaId("chill-sign-in")
        .setMediaMetadata(
            new MediaMetadata.Builder()
                .setIsBrowsable(false)
                .setIsPlayable(false)
                .setTitle(getString(R.string.car_sign_in_on_phone))
                .build())
        .build();
  }

  /** Turns a browse entry into the item the car shows, with its cover when it has one. */
  private MediaItem toItem(Node node) {
    MediaMetadata.Builder metadata =
        new MediaMetadata.Builder()
            .setIsBrowsable(node.browsable())
            .setIsPlayable(node.playable())
            .setTitle(node.title())
            .setArtist(node.subtitle().isEmpty() ? null : node.subtitle());

    if (node.artFilename() != null) {
      metadata.setArtworkUri(
          Uri.parse(
              server.url("/api/v1/media/cover/" + Uri.encode(node.artFilename()) + "?size=256")));
    }

    return new MediaItem.Builder().setMediaId(node.id()).setMediaMetadata(metadata.build()).build();
  }

  /**
   * The entries under a place in the tree.
   *
   * @throws IOException when the server cannot answer
   */
  private List<Node> children(String parentId, int page, int pageSize) throws IOException {
    int size = Math.min(Math.max(pageSize, 1), MAX_PAGE);
    LibraryTree.Target target = LibraryTree.parse(parentId);

    return switch (target.kind()) {
      case ROOT ->
          LibraryTree.rootChildren(
              List.of(
                  getString(R.string.car_shuffle_all),
                  getString(R.string.car_playlists),
                  getString(R.string.car_albums),
                  getString(R.string.car_artists)));
      case PLAYLIST_LIST -> library.playlists(page, size);
      case ALBUM_LIST -> library.albums(page, size);
      case ARTIST_LIST -> library.artists(page, size);
      case ARTIST -> library.artistAlbums(target.listId(), page, size);
      case ALBUM -> LibraryTree.trackNodes(parentId, library.albumTracks(target.listId()));
      case PLAYLIST -> LibraryTree.trackNodes(parentId, library.playlistTracks(target.listId()));
      default -> List.of();
    };
  }

  /**
   * What to play for a chosen entry: the queue it belongs to and where in it to start.
   *
   * @throws IOException when the server cannot answer
   */
  private MediaSession.MediaItemsWithStartPosition queueFor(String mediaId) throws IOException {
    LibraryTree.Target target = LibraryTree.parse(mediaId);
    List<String> tracks =
        switch (target.kind()) {
          case SHUFFLE -> library.randomTracks(SHUFFLE_COUNT);
          case ALBUM, TRACK_IN_ALBUM -> library.albumTracks(target.listId());
          case PLAYLIST, TRACK_IN_PLAYLIST -> library.playlistTracks(target.listId());
          default -> List.of();
        };
    List<MediaItem> items = nativePlayback.items(tracks);
    int start = 0;

    for (int i = 0; i < items.size(); i++) {
      if (items.get(i).mediaId.equals(String.valueOf(target.trackId()))) {
        start = i;
      }
    }

    if (items.isEmpty()) {
      throw new IOException("nothing to play");
    }

    return new MediaSession.MediaItemsWithStartPosition(items, start, 0);
  }

  /** Points the media session at the mirror or the native player, and pauses whichever loses. */
  private final class Handoff implements PlaybackArbiter.Handoff {

    @Override
    public void use(PlaybackArbiter.Side side) {
      session.setPlayer(side == PlaybackArbiter.Side.NATIVE ? nativePlayback.player() : player);
    }

    @Override
    public void pauseWebView() {
      hub.sendCommand(MirrorCommand.of(MirrorCommand.Action.PAUSE));
    }

    @Override
    public void pauseNative() {
      nativePlayback.player().pause();
    }
  }

  /** Answers Android Auto's requests to connect and to browse. */
  private final class LibraryCallback implements MediaLibrarySession.Callback {

    /** Lets an app connect only if the {@link CallerAllowlist} allows it. */
    @Override
    public MediaSession.ConnectionResult onConnect(
        MediaSession mediaSession, MediaSession.ControllerInfo controller) {
      if (!CallerAllowlist.isAllowed(controller.getPackageName(), getPackageName())) {
        return MediaSession.ConnectionResult.reject();
      }

      return MediaLibrarySession.Callback.super.onConnect(mediaSession, controller);
    }

    /**
     * Android asks what to play when the car taps Chill with nothing loaded, even if the app was
     * killed. The answer is the last saved queue; the native player takes the session first.
     */
    @Override
    public ListenableFuture<MediaSession.MediaItemsWithStartPosition> onPlaybackResumption(
        MediaSession mediaSession, MediaSession.ControllerInfo controller, boolean isForPlayback) {
      return nativePlayback
          .savedQueue()
          .map(
              queue -> {
                arbiter.onNativeStarted();

                return Futures.immediateFuture(queue);
              })
          .orElseGet(
              () ->
                  Futures.<MediaSession.MediaItemsWithStartPosition>immediateFailedFuture(
                      new UnsupportedOperationException("no saved queue")));
    }

    /** Returns the top of the browse tree. */
    @Override
    public ListenableFuture<LibraryResult<MediaItem>> onGetLibraryRoot(
        MediaLibrarySession mediaSession,
        MediaSession.ControllerInfo browser,
        @Nullable LibraryParams params) {
      return Futures.immediateFuture(LibraryResult.ofItem(rootItem(), params));
    }

    /**
     * Returns one page of a list. A signed-out user sees only the sign-in message; a failed
     * request is an error result, never a crash.
     */
    @Override
    public ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> onGetChildren(
        MediaLibrarySession mediaSession,
        MediaSession.ControllerInfo browser,
        String parentId,
        int page,
        int pageSize,
        @Nullable LibraryParams params) {
      return network.submit(
          () -> {
            try {
              ImmutableList<MediaItem> items =
                  children(parentId, page, pageSize).stream()
                      .map(ChillMediaService.this::toItem)
                      .collect(ImmutableList.toImmutableList());

              return LibraryResult.ofItemList(items, params);
            } catch (SignedOutException e) {
              return LibraryResult.ofItemList(ImmutableList.of(signInItem()), params);
            } catch (IOException e) {
              return LibraryResult.<ImmutableList<MediaItem>>ofError(
                  LibraryResult.RESULT_ERROR_IO);
            }
          });
    }

    /** Returns one entry by id; only the top is described, since the car browses from there. */
    @Override
    public ListenableFuture<LibraryResult<MediaItem>> onGetItem(
        MediaLibrarySession mediaSession, MediaSession.ControllerInfo browser, String mediaId) {
      MediaItem item =
          LibraryTree.ROOT.equals(mediaId)
              ? rootItem()
              : new MediaItem.Builder().setMediaId(mediaId).build();

      return Futures.immediateFuture(LibraryResult.ofItem(item, null));
    }

    /**
     * The car chose something to play. It is turned into its queue (the album or playlist it is
     * in, or random tracks), the native player takes the session, and playback starts at the
     * chosen track. Anything that is not from our tree is left to media3's default.
     */
    @Override
    public ListenableFuture<MediaSession.MediaItemsWithStartPosition> onSetMediaItems(
        MediaSession mediaSession,
        MediaSession.ControllerInfo controller,
        List<MediaItem> mediaItems,
        int startIndex,
        long startPositionMs) {
      boolean ours =
          mediaItems.size() == 1
              && LibraryTree.parse(mediaItems.get(0).mediaId).kind()
                  != LibraryTree.Kind.UNKNOWN;

      if (!ours) {
        return MediaLibrarySession.Callback.super.onSetMediaItems(
            mediaSession, controller, mediaItems, startIndex, startPositionMs);
      }

      // The queue is fetched off the main thread; the player swap must happen on it
      return Futures.transform(
          network.submit(() -> queueFor(mediaItems.get(0).mediaId)),
          queue -> {
            arbiter.onNativeStarted();

            return queue;
          },
          ContextCompat.getMainExecutor(ChillMediaService.this));
    }
  }
}
