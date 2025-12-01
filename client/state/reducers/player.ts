import { createSlice, PayloadAction as Action } from "@reduxjs/toolkit";

import { CastSdk } from "@client/lib/cast/CastSdk";
import {
  Maybe,
  PlayableTrack,
  PlayableTrackWithIndex,
  PlayPayload,
  PlayMode,
  PlayOptions,
} from "@common/types";
import { MobileDisplayMode } from "./player.types";
import { PreCastPayload } from "@client/lib/cast/types";
import { api } from "@client/client";
import { shuffle as _shuffle, findIndex } from "@common/commonUtils";

export let audio = new Audio();
export let crossover = new Audio();

export type PlayerState = {
  is_casting: boolean;
  is_playing: boolean;
  is_shuffled: boolean;
  now_playing: Maybe<PlayableTrackWithIndex>;
  next_playing: Maybe<PlayableTrackWithIndex>;
  original_playlist: Array<PlayableTrackWithIndex>;
  playlist: Array<PlayableTrackWithIndex>;
  cast_info: Maybe<PreCastPayload>;
  index: number;
  volume: number;
  mobile_display_mode: MobileDisplayMode;
  play_options: PlayOptions;
};

const initialState: PlayerState = {
  is_casting: false,
  is_playing: false,
  is_shuffled: false,
  now_playing: null,
  next_playing: null,
  original_playlist: [],
  playlist: [],
  cast_info: null,
  index: 0,
  volume: 1,
  mobile_display_mode: MobileDisplayMode.None,
  play_options: {
    mode: PlayMode.None,
    more: false,
  },
};

export type PlayLoad = PlayPayload & {
  cast_info?: Maybe<PreCastPayload>;
};

const addSemanticIndex = (
  tracks: Array<PlayableTrack>,
  index?: string,
): Array<PlayableTrackWithIndex> =>
  tracks.map((track, sub_index) => ({
    ...track,
    _index:
      index === undefined ? sub_index.toString() : `${index}.${sub_index + 1}`,
  }));

export const playerSlice = createSlice({
  name: "player",
  initialState,
  reducers: {
    addToQueue: (
      state,
      action: Action<{
        tracks: Array<PlayableTrack>;
        cast_info: Maybe<PreCastPayload>;
      }>,
    ) => {
      const { tracks, cast_info } = action.payload;

      const tracks_with_index = addSemanticIndex(
        tracks,
        (state.playlist?.length ?? 0).toString(),
      );

      state.playlist = [...state.playlist, ...tracks_with_index];

      if (state.is_casting) {
        if (state.cast_info === null) {
          return console.error(
            "Tried to add track(s) to queue on cast but could not find their information",
          );
        }

        if (cast_info === null) {
          return console.error(
            `Tried to add to "add to queue" while casting but did not receive cast_info.`,
          );
        }

        const payload = getCastPayload(tracks_with_index, cast_info);

        state.cast_info = [...state.cast_info, ...cast_info];

        CastSdk.Queue([], payload.map(CastSdk.Media));
      }
    },

    changeVolume: (state, action: Action<number>) => {
      state.volume = audio.volume = action.payload;
      crossover.volume = action.payload;
    },

    clear: (state) => {
      audio.pause();
      state.is_playing = false;
      state.now_playing = null;
      state.next_playing = null;
      state.playlist = [];
      state.index = 0;
    },

    pause: (state) => {
      if (state.is_casting) {
        CastSdk.Pause();
      } else {
        audio.pause();
      }

      state.is_playing = false;
    },

    play: (state, action: Action<PlayLoad>) => {
      const {
        tracks,
        cast_info = null,
        index = 0,
        progress = 0,
        is_virtual = false,
        skip_reload = false,
        play_options = { mode: PlayMode.None, more: false },
      } = action.payload;

      const tracks_with_index = skip_reload
        ? state.playlist
        : addSemanticIndex(tracks ?? []);

      if (tracks) {
        state.playlist = tracks_with_index;
        state.index = index;
        state.now_playing = tracks_with_index[index];
        state.next_playing = tracks_with_index[index + 1] ?? null;
        state.mobile_display_mode = MobileDisplayMode.Fullscreen;
        state.cast_info = cast_info;
        state.play_options = { ...play_options };

        if (state.is_casting) {
          if (state.cast_info === null || state.now_playing === null) {
            alert("missing cast info");
            return console.error(
              "Tried to play items on cast but could not find their information",
            );
          }

          const payload = getCastPayload(state.playlist, state.cast_info);
          const current_time = progress
            ? progress * state.now_playing.duration
            : 0;
          CastSdk.Play(payload, state.index, current_time);
        } else {
          load(state);
        }
      }

      if (!state.now_playing) {
        return;
      }

      // Virtual play happens when the source is remote controlling playback on
      // a target
      if (is_virtual) {
        state.is_playing = true;
        return;
      }

      // TODO: Create a common interface and facade over the cast SDK and audio
      if (state.is_casting) {
        // Only resume if no files are provided, cast will autoplay otherwise
        if (!tracks_with_index) {
          CastSdk.ResumePlay();
        }
      } else {
        audio.play();
      }

      state.is_playing = true;
      state.is_shuffled = false;
    },

    playNext: (
      state,
      action: Action<{
        tracks: Array<PlayableTrack>;
        cast_info: Maybe<PreCastPayload>;
      }>,
    ) => {
      const { tracks, cast_info } = action.payload;

      const tracks_with_index = addSemanticIndex(
        tracks,
        (state.now_playing?._index ?? 0).toString(),
      );

      const head = state.playlist.slice(0, state.index + 1);
      const tail = state.playlist.slice(state.index + 1);

      state.playlist = [...head, ...tracks_with_index, ...tail];
      state.next_playing = state.playlist[state.index + 1] ?? null;
      loadNext(state);

      if (state.is_casting) {
        if (state.cast_info === null) {
          return console.error(
            "Tried to add track(s) to play next on cast but could not find their information",
          );
        }

        if (cast_info === null) {
          return console.error(
            `Tried to add to "play next" while casting but did not receive cast_info.`,
          );
        }

        const cast_info_head = state.cast_info.slice(0, state.index + 1);
        const cast_info_tail = state.cast_info.slice(state.index + 1);
        const payload = getCastPayload(tracks_with_index, cast_info);

        state.cast_info = [...cast_info_head, ...cast_info, ...cast_info_tail];

        CastSdk.PlayNext(payload);
      }
    },

    previous: (state, action: Action<{ is_virtual?: boolean }>) => {
      const { is_virtual = false } = action.payload;
      state.index--;

      if (state.index < 0) {
        state.index = state.playlist.length - 1;
      }

      if (!state.playlist[state.index]) {
        return;
      }

      state.now_playing = state.playlist[state.index];
      state.next_playing = state.playlist[state.index + 1] ?? null;

      if (is_virtual) {
        return;
      }

      if (state.is_casting) {
        if (state.cast_info === null) {
          return console.error(
            "Tried to play previous items on cast but could not find their information",
          );
        }
        const payload = getCastPayload(state.playlist, state.cast_info);
        CastSdk.Play(payload, state.index);
        CastSdk.Previous();
      } else {
        load(state);
        audio.play();
      }

      state.is_playing = true;
    },

    next: (state, action: Action<{ auto?: boolean; is_virtual?: boolean }>) => {
      const { auto = false, is_virtual = false } = action.payload;

      state.index++;

      if (state.index === state.playlist.length) {
        if (auto) {
          return;
        }
        state.index = 0;
      }

      if (!state.playlist[state.index]) {
        return;
      }

      state.now_playing = state.playlist[state.index];
      state.next_playing = state.playlist[state.index + 1] ?? null;

      if (is_virtual) {
        return;
      }

      if (crossover.src) {
        [audio, crossover] = [crossover, audio];
      }

      if (state.is_casting) {
        if (auto) {
          // Don't trigger here - chromecast has autoplayed and called "next"
          return;
        } else if (state.cast_info === null) {
          return console.error(
            "Tried to play next items on cast but could not find their information",
          );
        } else {
          const payload = getCastPayload(state.playlist, state.cast_info);
          CastSdk.Play(payload, state.index);
        }
      } else {
        // Use the crossover (previously queued) after the first track
        load(state, state.index > 0 && !!crossover.src);
        audio.play();
        crossover.pause();
      }

      state.is_playing = true;
    },

    seek: (state, action: Action<number>) => {
      const percent = action.payload;

      if (!state.now_playing || Number.isNaN(state.now_playing?.duration)) {
        return;
      }

      const time = state.now_playing.duration * percent;

      if (state.is_casting) {
        CastSdk.Seek(time);
        return;
      }

      audio.currentTime = time;
    },

    shuffle: (
      state,
      action: Action<Array<PlayableTrackWithIndex> | undefined>,
    ) => {
      // The only time tracks are sent is if this is the source in a websocket
      // connection and the target sends the newly shuffled playlist
      const tracks = action?.payload;

      if (state.is_shuffled) {
        state.playlist = [...state.original_playlist];
      } else {
        state.original_playlist = [...state.playlist];
        state.playlist =
          tracks && tracks.length ? tracks : _shuffle(state.playlist);
      }

      state.is_shuffled = !state.is_shuffled;
      state.index = findIndex(
        state.playlist,
        (file) => file.path === state.now_playing?.path,
      );

      // Move now playing to be first after shuffling
      if (state.is_shuffled) {
        state.playlist = [
          state.playlist.splice(state.index, 1)[0],
          ...state.playlist,
        ];
        state.index = 0;
      }

      loadNext(state);
    },

    setIsPlaying: (state) => {
      state.is_playing = true;
    },

    setMobileDisplayMode: (state, action: Action<MobileDisplayMode>) => {
      state.mobile_display_mode = action.payload;
    },

    setPlayerIsCasting: (state, action: Action<boolean>) => {
      const active = action.payload ?? false;
      state.is_casting = active;
      state.is_playing = false;
    },

    updatePlayOptions: (state, action: Action<PlayOptions>) => {
      const options = action.payload;

      state.play_options = { ...options };
    },

    replaceState: (_state, action: Action<PlayerState>) => action.payload,
  },
});

export const {
  addToQueue,
  changeVolume,
  clear,
  next,
  pause,
  play,
  playNext,
  previous,
  replaceState,
  seek,
  setIsPlaying,
  setMobileDisplayMode,
  setPlayerIsCasting,
  shuffle,
  updatePlayOptions,
} = playerSlice.actions;

export default playerSlice.reducer;

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
  return info.map((info, index) => ({ ...info, meta: tracks[index] }));
};

/**
 * Load an audio file
 *
 * @param state - player state
 * @param use_crossover - audio is loaded from the crossover audio
 */
const load = (state: PlayerState, use_crossover = false) => {
  /**
   * If we have not swapped the audio with the crossover audio we should set the
   * src of the audio to be now playing. Otherwise the crossover will have
   * already been set as the current audio.
   */
  if (!use_crossover) {
    audio.src = `/api/v1/media/${state.now_playing?.id}/load`;
  }

  if (state.next_playing) {
    crossover.src = `/api/v1/media/${state.next_playing?.id}/load`;
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
const loadNext = (state: PlayerState) => {
  state.next_playing = state.playlist[state.index + 1] ?? null;

  crossover.src = state.next_playing
    ? `/api/v1/media/${state.next_playing?.id}/load`
    : "";
};

export const getPlayPayload =
  (is_casting: boolean, tracks: Array<PlayableTrack>) => async () => {
    let cast_info: Maybe<PreCastPayload> = null;

    if (is_casting) {
      cast_info = await api.track.castInfo.query({
        track_ids: tracks.map((track) => track.id),
      });
    }

    return { tracks, cast_info };
  };
