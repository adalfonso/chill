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
  constructor(private _playlist: Playlist) {
    this._audio.addEventListener("ended", () => {
      if (!this._playlist.has_next_track) {
        return;
      }
      this.next();
    });
  }

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

  get now_playing() {
    return this._current;
  }

  /** 0-100 progress percentage of track */
  get progress() {
    if (!this._audio.duration || !this._audio.currentTime) {
      return 0;
    }

    return (this._audio.currentTime / this._audio.duration) * 100;
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
  public async next() {
    this._playlist.next();

    return this._load(this._is_playing);
  }

  /** Play the previous item in the playlist */
  public async previous() {
    this._playlist.previous();
    return this._load(this._is_playing);
  }

  /** Scrub to a certain part of the track */
  public seek(percent: number) {
    this._audio.currentTime = this._audio.duration * percent;
  }

  /**
   * Set new playlist for the audio player
   *
   * @param playlist list of audio tracks to play
   * @returns true confirmation when playing has begun
   */
  public async setPlaylist(playlist: Playlist) {
    this._playlist = playlist;
    return this._load();
  }

  /**
   * Load the current audio track
   *
   * @param autoplay if the new item should play automatically
   * @returns true confirmation when playing has begun
   */
  private _load(autoplay = true) {
    this._current = this._playlist.current;

    // Loaded with an empty playlist
    if (!this._current) {
      return;
    }

    this._audio.src = `/media/${this._current._id}/load`;
    return autoplay ? this.play() : false;
  }
}
