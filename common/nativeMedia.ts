/**
 * Shared shapes for the WebView <-> native media bridge
 *
 * The WebView pushes a snapshot of its player to the Android media service,
 * which mirrors it into Android Auto. Car commands travel the other way.
 * These types have no server or Prisma imports, so the client bundle can use
 * them freely.
 */

/** The track the phone is currently playing, as the car needs to show it */
export type NativeMediaTrack = {
  id: number;
  title: string;
  artist: string | null;
  album: string | null;
  duration_s: number;
  /** 256px cover as base64 JPEG, or null while it loads or when unavailable */
  art_base64: string | null;
};

/** A snapshot of the phone's player, pushed to the native media service */
export type NativeMediaState = {
  track: NativeMediaTrack | null;
  is_playing: boolean;
  /** True while playback is stalled waiting for data */
  buffering: boolean;
  position_s: number;
  has_next: boolean;
  has_previous: boolean;
  /** True while the phone is remote-controlling another Chill device */
  remote: boolean;
};

/** The actions the car can ask the phone's player to perform */
export type NativeMediaAction = "play" | "pause" | "next" | "previous" | "seek";

/** A command from the car, relayed through the native media service */
export type NativeMediaCommand = {
  action: NativeMediaAction;
  /** Target position in seconds; present only for `seek` */
  position_s?: number;
};
