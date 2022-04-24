import { Media } from "@common/autogen";
import { Nullable } from "@server/types";
import { Playlist } from "./Playlist";

/** Manages playing of audio for the app */
export class Player {
  /** Singleton */
  private static _instance;

  /** If audio is currently playing */
  private _is_playing = false;

  /** Currently selected media */
  private _current: Nullable<Media>;

  /** Underlying audio element */
  private _audio: HTMLAudioElement = new Audio();

  /**
   * @param _playlist initial playlist
   */
  constructor(private _playlist: Playlist) {}

  /**
   * Get the instance or create & get an instance
   * @returns player instance
   */
  public static instance() {
    if (!Player._instance) {
      Player._instance = new Player(new Playlist());
    }

    return this._instance;
  }

  get is_playing() {
    return this._is_playing;
  }

  /**
   * Play the current audio
   *
   * @returns that the audio is playing
   */
  public async play() {
    await this._audio.play();
    this._is_playing = true;

    return true;
  }

  /**
   * Pause the current audio
   *
   * @returns that the audio is not playing
   */
  public async pause() {
    this._audio.pause();
    this._is_playing = false;

    return false;
  }

  /** Play the next item in the playlist */
  public next() {}

  /** Play the previous item in the playlist */
  public previous() {}

  /** Scrub to a certain part of the track */
  public scrubTo() {}

  /**
   * Set new playlist for the audio player
   *
   * @param playlist list of audio tracks to play
   *
   * @returns true confirmation when playing has begun
   */
  public async setPlaylist(playlist: Playlist) {
    this._playlist = playlist;
    this._current = this._playlist.current;

    // Loaded with an empty playlist
    if (!this._current) {
      return;
    }

    this._audio.src = `/media/${this._current._id}/load`;
    return this.play();
  }
}
