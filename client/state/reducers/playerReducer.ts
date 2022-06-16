import { Media } from "@common/autogen";
import { Nullable } from "@common/types";
import { WritableDraft } from "immer/dist/internal";
import { createSlice } from "@reduxjs/toolkit";

export const audio = new Audio();

export const getAudioProgress = () => {
  if (!audio.duration || !audio.currentTime) {
    return 0;
  }

  return (audio.currentTime / audio.duration) * 100;
};

const load = (state: WritableDraft<PlayerState>) => {
  audio.src = `/media/${state.now_playing?._id}/load`;
};

export interface PlayerState {
  is_playing: boolean;
  now_playing: Nullable<Media>;
  playlist: Media[];
  index: number;
  volume: number;
}

const initialState: PlayerState = {
  is_playing: false,
  now_playing: null,
  playlist: [],
  index: 0,
  volume: 1,
};

export const playerSlice = createSlice({
  name: "player",
  initialState,
  reducers: {
    play: (state, action) => {
      const { files, index = 0 } = action.payload;

      if (files) {
        state.playlist = files;
        state.index = index;
        state.now_playing = files[index];
        load(state);
      }

      audio.play();
      state.is_playing = true;
    },

    playNext: (state, action) => {
      const { file } = action.payload;
      const head = state.playlist.slice(0, state.index + 1);
      const tail = state.playlist.slice(state.index + 1);

      state.playlist = [...head, file, ...tail];
    },

    pause: (state) => {
      audio.pause();
      state.is_playing = false;
    },

    previous: (state) => {
      state.index--;

      if (state.index < 0) {
        state.index = state.playlist.length - 1;
      }

      state.now_playing = state.playlist[state.index];

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

      state.now_playing = state.playlist[state.index];

      load(state);
      audio.play();
      state.is_playing = true;
    },

    changeVolume: (state, action) => {
      state.volume = audio.volume = action.payload.percent;
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

      load(state);
      audio.play();
      state.is_playing = true;
    },

    seek: (_state, action) => {
      audio.currentTime = audio.duration * action.payload.percent;
    },

    setPlaylist: (state, action) => {
      load(state);
      state.playlist = action.payload.playlist;
    },
  },
});

export const {
  play,
  playNext,
  pause,
  previous,
  next,
  changeTrack,
  changeVolume,
  seek,
  setPlaylist,
} = playerSlice.actions;

export default playerSlice.reducer;
