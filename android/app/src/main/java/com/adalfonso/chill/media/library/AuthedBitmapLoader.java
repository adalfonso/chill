package com.adalfonso.chill.media.library;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import androidx.media3.common.util.BitmapLoader;
import androidx.media3.common.util.UnstableApi;
import com.adalfonso.chill.media.auth.AuthedHttp;
import com.adalfonso.chill.media.auth.Reply;
import com.adalfonso.chill.media.auth.ServerConfig;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.common.util.concurrent.ListeningExecutorService;
import com.google.common.util.concurrent.MoreExecutors;
import java.io.IOException;
import java.util.concurrent.Executors;

/**
 * Loads cover art for the car with the user's login. Android Auto's own fetch carries no cookie,
 * and the server refuses covers without one. Only addresses on Chill's own server are fetched, so
 * the login is never sent anywhere else.
 */
@UnstableApi
public final class AuthedBitmapLoader implements BitmapLoader {

  private final AuthedHttp http;
  private final ServerConfig server;
  private final ListeningExecutorService executor =
      MoreExecutors.listeningDecorator(Executors.newFixedThreadPool(2));

  /**
   * @param http signs each request with the user's login
   * @param server tells which addresses belong to Chill
   */
  public AuthedBitmapLoader(AuthedHttp http, ServerConfig server) {
    this.http = http;
    this.server = server;
  }

  @Override
  public boolean supportsMimeType(String mimeType) {
    return mimeType.startsWith("image/");
  }

  @Override
  public ListenableFuture<Bitmap> decodeBitmap(byte[] data) {
    return executor.submit(() -> decode(data));
  }

  @Override
  public ListenableFuture<Bitmap> loadBitmap(Uri uri) {
    return executor.submit(() -> fetch(uri.toString()));
  }

  private Bitmap fetch(String url) throws IOException {
    String base = server.baseUrl();

    if (!url.startsWith(base + "/")) {
      throw new IOException("not a Chill address");
    }

    Reply reply = http.get(url.substring(base.length()));

    if (reply.status() != 200) {
      throw new IOException("cover request failed: " + reply.status());
    }

    return decode(reply.body());
  }

  private static Bitmap decode(byte[] data) throws IOException {
    Bitmap bitmap = BitmapFactory.decodeByteArray(data, 0, data.length);

    if (bitmap == null) {
      throw new IOException("unreadable image");
    }

    return bitmap;
  }
}
