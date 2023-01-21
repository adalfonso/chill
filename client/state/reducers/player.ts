import _ from "lodash";
import { Media } from "@common/models/Media";
import { Nullable } from "@common/types";
import { createSlice } from "@reduxjs/toolkit";

export let audio = new Audio();
export let crossover = new Audio();

export const getAudioProgress = () => {
  if (!audio.duration || !audio.currentTime) {
    return 0;
  }

  return (audio.currentTime / audio.duration) * 100;
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
    : null;
};

export interface PlayerState {
  is_playing: boolean;
  is_shuffled: boolean;
  now_playing: Nullable<Media>;
  next_playing: Nullable<Media>;
  original_playlist: Media[];
  playlist: Media[];
  index: number;
  volume: number;
}

const initialState: PlayerState = {
  is_playing: false,
  is_shuffled: false,
  now_playing: null,
  next_playing: null,
  original_playlist: [],
  playlist: [],
  index: 0,
  volume: 1,
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

    pause: (state) => {
      audio.pause();
      state.is_playing = false;
    },

    play: (state, action) => {
      const { files, index = 0 } = action.payload;

      if (files) {
        state.playlist = files;
        state.index = index;
        state.now_playing = files[index];
        state.next_playing = files[index + 1] ?? null;
        load(state);
      }

      if (!state.now_playing) {
        return;
      }

      audio.play();
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

      load(state);
      audio.play();
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

      load(state, !!crossover.src);
      audio.play();
      state.is_playing = true;
    },

    seek: (_state, action) => {
      if (Number.isNaN(audio.duration)) {
        return;
      }

      audio.currentTime = audio.duration * action.payload.percent;
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
    },
  },
});

export const {
  addToQueue,
  changeTrack,
  changeVolume,
  next,
  pause,
  play,
  playNext,
  previous,
  seek,
  setPlaylist,
  shuffle,
} = playerSlice.actions;

export default playerSlice.reducer;
