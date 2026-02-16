import { signal } from "@preact/signals";

import { CastSdk } from "@client/lib/cast/CastSdk";
import {
  Maybe,
  MobileDisplayMode,
  PlayableTrack,
  PlayableTrackWithIndex,
  PlayPayload,
  PlayMode,
  PlayOptions,
  PlayerState,
} from "@common/types";
export type { PlayerState } from "@common/types";
export { MobileDisplayMode } from "@common/types";
import { PreCastPayload } from "@client/lib/cast/types";
import { api } from "@client/client";
import { shuffle as _shuffle, findIndex } from "@common/commonUtils";

export let audio = new Audio();
export let crossover = new Audio();

export type PlayLoad = PlayPayload & {
  cast_info?: Maybe<PreCastPayload>;
};

export const is_casting = signal(false);
export const is_playing = signal(false);
export const is_shuffled = signal(false);
export const now_playing = signal<Maybe<PlayableTrackWithIndex>>(null);
export const next_playing = signal<Maybe<PlayableTrackWithIndex>>(null);
export const original_playlist = signal<Array<PlayableTrackWithIndex>>([]);
export const playlist = signal<Array<PlayableTrackWithIndex>>([]);
export const cast_info = signal<Maybe<PreCastPayload>>(null);
export const index = signal(0);
export const volume = signal(1);
export const mobile_display_mode = signal<MobileDisplayMode>(
  MobileDisplayMode.None,
);
export const play_options = signal<PlayOptions>({
  mode: PlayMode.None,
  more: false,
});

const addSemanticIndex = (
  tracks: Array<PlayableTrack>,
  idx?: string,
): Array<PlayableTrackWithIndex> =>
  tracks.map((track, sub_index) => ({
    ...track,
    _index:
      idx === undefined ? sub_index.toString() : `${idx}.${sub_index + 1}`,
  }));

export const addToQueue = (payload: {
  tracks: Array<PlayableTrack>;
  cast_info: Maybe<PreCastPayload>;
}) => {
  const { tracks, cast_info: cast_info_incoming } = payload;

  const tracks_with_index = addSemanticIndex(
    tracks,
    (playlist.value?.length ?? 0).toString(),
  );

  playlist.value = [...playlist.value, ...tracks_with_index];

  if (is_casting.value) {
    if (cast_info.value === null) {
      return console.error(
        "Tried to add track(s) to queue on cast but could not find their information",
      );
    }

    if (cast_info_incoming === null) {
      return console.error(
        `Tried to add to "add to queue" while casting but did not receive cast_info.`,
      );
    }

    const cast_payload = getCastPayload(tracks_with_index, cast_info_incoming);

    cast_info.value = [...cast_info.value, ...cast_info_incoming];

    CastSdk.Queue([], cast_payload.map(CastSdk.Media));
  }
};

export const changeVolume = (val: number) => {
  volume.value = audio.volume = val;
  crossover.volume = val;
};

export const clear = () => {
  audio.pause();
  is_playing.value = false;
  now_playing.value = null;
  next_playing.value = null;
  playlist.value = [];
  index.value = 0;
};

export const pause = () => {
  if (is_casting.value) {
    CastSdk.Pause();
  } else {
    audio.pause();
  }

  is_playing.value = false;
};

export const play = (payload: PlayLoad) => {
  const {
    tracks,
    cast_info: cast_info_incoming = null,
    index: idx = 0,
    progress = 0,
    is_virtual = false,
    skip_reload = false,
    play_options: play_options_incoming = { mode: PlayMode.None, more: false },
  } = payload;

  const tracks_with_index = skip_reload
    ? playlist.value
    : addSemanticIndex(tracks ?? []);

  if (tracks) {
    playlist.value = tracks_with_index;
    index.value = idx;
    now_playing.value = tracks_with_index[idx];
    next_playing.value = tracks_with_index[idx + 1] ?? null;
    mobile_display_mode.value = MobileDisplayMode.Fullscreen;
    cast_info.value = cast_info_incoming;
    play_options.value = { ...play_options_incoming };

    if (is_casting.value) {
      if (cast_info.value === null || now_playing.value === null) {
        alert("missing cast info");
        return console.error(
          "Tried to play items on cast but could not find their information",
        );
      }

      const cast_payload = getCastPayload(playlist.value, cast_info.value);
      const current_time = progress ? progress * now_playing.value.duration : 0;
      CastSdk.Play(cast_payload, index.value, current_time);
    } else {
      load();
    }
  }

  if (!now_playing.value) {
    return;
  }

  // Virtual play happens when the source is remote controlling playback on
  // a target
  if (is_virtual) {
    is_playing.value = true;
    return;
  }

  // Only resume if no files are provided, cast will autoplay otherwise
  if (is_casting.value) {
    if (!tracks_with_index) {
      CastSdk.ResumePlay();
    }
  } else {
    audio.play();
  }

  is_playing.value = true;
  is_shuffled.value = false;
};

export const playNext = (payload: {
  tracks: Array<PlayableTrack>;
  cast_info: Maybe<PreCastPayload>;
}) => {
  const { tracks, cast_info: cast_info_incoming } = payload;

  const tracks_with_index = addSemanticIndex(
    tracks,
    (now_playing.value?._index ?? 0).toString(),
  );

  const head = playlist.value.slice(0, index.value + 1);
  const tail = playlist.value.slice(index.value + 1);

  playlist.value = [...head, ...tracks_with_index, ...tail];
  next_playing.value = playlist.value[index.value + 1] ?? null;
  loadNextTrack();

  if (is_casting.value) {
    if (cast_info.value === null) {
      return console.error(
        "Tried to add track(s) to play next on cast but could not find their information",
      );
    }

    if (cast_info_incoming === null) {
      return console.error(
        `Tried to add to "play next" while casting but did not receive cast_info.`,
      );
    }

    const cast_info_head = cast_info.value.slice(0, index.value + 1);
    const cast_info_tail = cast_info.value.slice(index.value + 1);
    const cast_payload = getCastPayload(tracks_with_index, cast_info_incoming);

    cast_info.value = [
      ...cast_info_head,
      ...cast_info_incoming,
      ...cast_info_tail,
    ];

    CastSdk.PlayNext(cast_payload);
  }
};

export const previous = (payload: { is_virtual?: boolean }) => {
  const { is_virtual = false } = payload;
  let idx = index.value - 1;

  if (idx < 0) {
    idx = playlist.value.length - 1;
  }

  index.value = idx;

  if (!playlist.value[idx]) {
    return;
  }

  now_playing.value = playlist.value[idx];
  next_playing.value = playlist.value[idx + 1] ?? null;

  if (is_virtual) {
    return;
  }

  if (is_casting.value) {
    if (cast_info.value === null) {
      return console.error(
        "Tried to play previous items on cast but could not find their information",
      );
    }
    const cast_payload = getCastPayload(playlist.value, cast_info.value);
    CastSdk.Play(cast_payload, idx);
    CastSdk.Previous();
  } else {
    load();
    audio.play();
  }

  is_playing.value = true;
};

export const next = (payload: { auto?: boolean; is_virtual?: boolean }) => {
  const { auto = false, is_virtual = false } = payload;

  let idx = index.value + 1;

  if (idx === playlist.value.length) {
    if (auto) {
      return;
    }
    idx = 0;
  }

  index.value = idx;

  if (!playlist.value[idx]) {
    return;
  }

  now_playing.value = playlist.value[idx];
  next_playing.value = playlist.value[idx + 1] ?? null;

  if (is_virtual) {
    return;
  }

  if (crossover.src) {
    [audio, crossover] = [crossover, audio];
  }

  if (is_casting.value) {
    if (auto) {
      // Don't trigger here - chromecast has autoplayed and called "next"
      return;
    } else if (cast_info.value === null) {
      return console.error(
        "Tried to play next items on cast but could not find their information",
      );
    } else {
      const cast_payload = getCastPayload(playlist.value, cast_info.value);
      CastSdk.Play(cast_payload, idx);
    }
  } else {
    // Use the crossover (previously queued) after the first track
    load(idx > 0 && !!crossover.src);
    audio.play();
    crossover.pause();
  }

  is_playing.value = true;
};

export const seek = (percent: number) => {
  if (!now_playing.value || Number.isNaN(now_playing.value?.duration)) {
    return;
  }

  const time = now_playing.value.duration * percent;

  if (is_casting.value) {
    CastSdk.Seek(time);
    return;
  }

  audio.currentTime = time;
};

export const shuffle = (tracks?: Array<PlayableTrackWithIndex>) => {
  if (is_shuffled.value) {
    playlist.value = [...original_playlist.value];
  } else {
    original_playlist.value = [...playlist.value];
    playlist.value =
      tracks && tracks.length ? tracks : _shuffle(playlist.value);
  }

  is_shuffled.value = !is_shuffled.value;

  const newIndex = findIndex(
    playlist.value,
    (file) => file.path === now_playing.value?.path,
  );

  if (is_shuffled.value) {
    const current = playlist.value[newIndex];
    const rest = [
      ...playlist.value.slice(0, newIndex),
      ...playlist.value.slice(newIndex + 1),
    ];
    playlist.value = [current, ...rest];
    index.value = 0;
  } else {
    index.value = newIndex;
  }

  loadNextTrack();
};

export const setIsPlaying = () => {
  is_playing.value = true;
};

export const setMobileDisplayMode = (mode: MobileDisplayMode) => {
  mobile_display_mode.value = mode;
};

export const setPlayerIsCasting = (active: boolean) => {
  is_casting.value = active ?? false;
  is_playing.value = false;
};

export const updatePlayOptions = (options: PlayOptions) => {
  play_options.value = { ...options };
};

export const replaceState = (state: PlayerState) => {
  is_casting.value = state.is_casting;
  is_playing.value = state.is_playing;
  is_shuffled.value = state.is_shuffled;
  now_playing.value = state.now_playing;
  next_playing.value = state.next_playing;
  original_playlist.value = state.original_playlist;
  playlist.value = state.playlist;
  cast_info.value = state.cast_info as Maybe<PreCastPayload>;
  index.value = state.index;
  volume.value = state.volume;
  mobile_display_mode.value = state.mobile_display_mode;
  play_options.value = state.play_options;
};

export const getSnapshot = (): PlayerState => ({
  is_casting: is_casting.value,
  is_playing: is_playing.value,
  is_shuffled: is_shuffled.value,
  now_playing: now_playing.value,
  next_playing: next_playing.value,
  original_playlist: original_playlist.value,
  playlist: playlist.value,
  cast_info: cast_info.value,
  index: index.value,
  volume: volume.value,
  mobile_display_mode: mobile_display_mode.value,
  play_options: play_options.value,
});

export const getPlayPayload =
  (casting: boolean, tracks: Array<PlayableTrack>) => async () => {
    let cast_info: Maybe<PreCastPayload> = null;

    if (casting) {
      cast_info = await api.track.castInfo.query({
        track_ids: tracks.map((track) => track.id),
      });
    }

    return { tracks, cast_info };
  };

/**
 * Merge media and their cast information into a single cast payload
 *
 * @param tracks - media files
 * @param info - cast play info
 * @returns merged data
 */
const getCastPayload = (
  tracks: Array<PlayableTrackWithIndex>,
  info: PreCastPayload,
) => {
  return info.map((info, idx) => ({ ...info, meta: tracks[idx] }));
};

/**
 * Load an audio file
 *
 * @param state - player state
 * @param use_crossover - audio is loaded from the crossover audio
 */
const load = (use_crossover = false) => {
  /**
   * If we have not swapped the audio with the crossover audio we should set the
   * src of the audio to be now playing. Otherwise the crossover will have
   * already been set as the current audio.
   */
  if (!use_crossover) {
    audio.src = `/api/v1/media/${now_playing.value?.id}/load`;
  }

  if (next_playing.value) {
    crossover.src = `/api/v1/media/${next_playing.value?.id}/load`;
  }
};

/**
 * Force reload the next track
 *
 * This is used when something is added the the playlist but the crossover audio
 * needs to be reloaded with the next track.
 *
 * @param state - player state
 */
const loadNextTrack = () => {
  next_playing.value = playlist.value[index.value + 1] ?? null;

  crossover.src = next_playing.value
    ? `/api/v1/media/${next_playing.value?.id}/load`
    : "";
};
