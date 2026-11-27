package com.adalfonso.chill.media.playback;

import android.content.Context;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DataSource;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.datasource.ResolvingDataSource;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import com.adalfonso.chill.media.auth.SessionAuth;
import java.util.Map;

/** Builds the player that streams music from the server. */
@UnstableApi
public final class NativePlayerFactory {

  private NativePlayerFactory() {}

  /**
   * Creates a player for music: it asks for audio focus, pauses when headphones come out, and
   * keeps the network awake while playing. Every request carries the current access cookie, read
   * fresh each time so a refreshed one is picked up.
   *
   * @param context the app context
   * @param auth where the access cookie comes from
   * @return the player; it queues items so the next track is prepared ahead of time
   */
  public static ExoPlayer create(Context context, SessionAuth auth) {
    DataSource.Factory authed =
        new ResolvingDataSource.Factory(
            new DefaultHttpDataSource.Factory(),
            spec -> {
              String cookies = auth.accessCookies();

              return cookies == null ? spec : spec.withAdditionalHeaders(Map.of("Cookie", cookies));
            });

    return new ExoPlayer.Builder(context)
        .setMediaSourceFactory(new DefaultMediaSourceFactory(authed))
        .setAudioAttributes(
            new AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .build(),
            true)
        .setHandleAudioBecomingNoisy(true)
        .setWakeMode(C.WAKE_MODE_NETWORK)
        .build();
  }
}
