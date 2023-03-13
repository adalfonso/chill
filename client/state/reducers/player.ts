import * as _ from "lodash-es";
import { CastSdk } from "@client/lib/cast/CastSdk";
import { Media } from "@common/models/Media";
import { Nullable, ObjectValues } from "@common/types";
import { PreCastPayload } from "@client/lib/cast/types";
import { client } from "@client/client";
import { createSlice } from "@reduxjs/toolkit";
import { play as castPlay } from "@client/lib/cast/Cast";

export let audio = new Audio();
export let crossover = new Audio();

/**
 * Get the audio progress for a playing track
 *
 * @param media - media that is playing
 * @param is_casting - if the media is playing on chromecast
 * @returns progress percentage 0-100
 */
export const getAudioProgress = (
  media: Nullable<Media>,
  is_casting = false,
) => {
  if (media === null || !media.duration) {
    return 0;
  }

  if (is_casting) {
    return (CastSdk.currentTime() / media.duration) * 100;
  }

  return audio.currentTime ? (audio.currentTime / media.duration) * 100 : 0;
};

/**
 * Merge media and their cast information into a single cast payload
 *
 * @param files - media files
 * @param info - cast play info
 * @returns merged data
 */
const getCastPayload = (files: Media[], info: PreCastPayload) => {
  return info.map((info, index) => ({ ...info, meta: files[index] }));
};

export const MobileDisplayMode = {
  Fullscreen: "fullscreen",
  Minimized: "minimized",
  None: "none",
} as const;

export type MobileDisplayMode = ObjectValues<typeof MobileDisplayMode>;

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
    audio.src = `/api/v1/media/${state.now_playing?._id}/load`;
  }

  if (state.next_playing) {
    crossover.src = `/api/v1/media/${state.next_playing?._id}/load`;
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
  crossover.src = state.next_playing
    ? `/api/v1/media/${state.next_playing?._id}/load`
    : "";
};

export interface PlayerState {
  is_casting: boolean;
  is_playing: boolean;
  is_shuffled: boolean;
  now_playing: Nullable<Media>;
  next_playing: Nullable<Media>;
  original_playlist: Media[];
  playlist: Media[];
  cast_info: Nullable<PreCastPayload>;
  index: number;
  volume: number;
  mobile_display_mode: MobileDisplayMode;
}

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
};

export const playerSlice = createSlice({
  name: "player",
  initialState,
  reducers: {
    addToQueue: (state, action) => {
      const { files } = action.payload;
      state.playlist = [...state.playlist, ...files];
    },

    changeTrack: (state, action) => {
      const index = action.payload.index;

      if (index < 0 || index >= state.playlist.length) {
        console.error(
          `Cannot change track to index "${index}" as it is out of bounds`,
        );

        return;
      }

      state.index = index;
      state.now_playing = state.playlist[state.index];
      state.next_playing = state.playlist[state.index + 1] ?? null;

      load(state);
      audio.play();
      state.is_playing = true;
    },

    changeVolume: (state, action) => {
      state.volume = audio.volume = action.payload.percent;
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
      state.is_casting ? CastSdk.Pause() : audio.pause();
      state.is_playing = false;
    },

    play: (state, action) => {
      const { files, cast_info, index = 0 } = action.payload;

      if (files) {
        state.playlist = files;
        state.index = index;
        state.now_playing = files[index];
        state.next_playing = files[index + 1] ?? null;
        state.mobile_display_mode = MobileDisplayMode.Fullscreen;
        state.cast_info = cast_info;

        if (state.is_casting) {
          if (state.cast_info === null) {
            return console.error(
              "Tried to play items on cast but could not find their information",
            );
          }

          const payload = getCastPayload(state.playlist, state.cast_info);
          castPlay(payload, state.index);
        } else {
          load(state);
        }
      }

      if (!state.now_playing) {
        return;
      }

      // TODO: Create a common interface and facade over the cast SDK and audio
      state.is_casting ? CastSdk.Play() : audio.play();
      state.is_playing = true;
      state.is_shuffled = false;
    },

    playNext: (state, action) => {
      const { files } = action.payload;
      const head = state.playlist.slice(0, state.index + 1);
      const tail = state.playlist.slice(state.index + 1);

      state.playlist = [...head, ...files, ...tail];
      state.next_playing = state.playlist[state.index + 1] ?? null;
      loadNext(state);
    },

    previous: (state) => {
      state.index--;

      if (state.index < 0) {
        state.index = state.playlist.length - 1;
      }

      if (!state.playlist[state.index]) {
        return;
      }

      state.now_playing = state.playlist[state.index];
      state.next_playing = state.playlist[state.index + 1] ?? null;

      if (state.is_casting) {
        if (state.cast_info === null) {
          return console.error(
            "Tried to play previous items on cast but could not find their information",
          );
        }
        const payload = getCastPayload(state.playlist, state.cast_info);
        castPlay(payload, state.index);

        CastSdk.Previous();
      } else {
        load(state);
        audio.play();
      }

      state.is_playing = true;
    },

    next: (state, action) => {
      const { auto = false } = action.payload ?? {};

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

      if (crossover.src) {
        [audio, crossover] = [crossover, audio];
      }

      if (state.is_casting) {
        if (auto) {
          CastSdk.Next();
        } else if (state.cast_info === null) {
          return console.error(
            "Tried to play next items on cast but could not find their information",
          );
        } else {
          const payload = getCastPayload(state.playlist, state.cast_info);
          castPlay(payload, state.index);
        }
      } else {
        load(state, !!crossover.src);
        audio.play();
      }

      state.is_playing = true;
    },

    seek: (state, action) => {
      const { percent } = action.payload;

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

    setPlaylist: (state, action) => {
      load(state);
      state.playlist = action.payload.playlist;
    },

    shuffle: (state) => {
      if (state.is_shuffled) {
        state.playlist = [...state.original_playlist];
      } else {
        state.original_playlist = [...state.playlist];
        state.playlist = _.shuffle(state.playlist);
      }

      state.is_shuffled = !state.is_shuffled;
      state.index = _.findIndex(
        state.playlist,
        (file) => file.path === state.now_playing?.path,
      );

      // Move now playing to be first after shuffling
      if (state.is_shuffled) {
        state.playlist = [
          state.playlist.splice(state.index, 1)[0],
          ...state.playlist,
        ];
      }
    },

    setMobileDisplayMode: (state, action) => {
      state.mobile_display_mode = action.payload.mobile_display_mode;
    },

    setPlayerIsCasting: (state, action) => {
      const { active = false } = action.payload;
      state.is_casting = active;
    },
  },
});

export const {
  addToQueue,
  changeTrack,
  changeVolume,
  next,
  clear,
  pause,
  play,
  playNext,
  previous,
  seek,
  setPlaylist,
  shuffle,
  setMobileDisplayMode,
  setPlayerIsCasting,
} = playerSlice.actions;

export default playerSlice.reducer;

export const getPlayPayload =
  (is_casting: boolean, files: Media[]) => async () => {
    let cast_info: Nullable<PreCastPayload> = null;

    if (is_casting) {
      cast_info = await client.media.castInfo.query({
        media_ids: files.map((file) => file._id),
      });
    }

    return { files, cast_info };
  };
