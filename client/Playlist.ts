import { Media } from "@common/autogen";

/** Keeps track of all audio tracks under a given domain */
export class Playlist {
  /**
   * @param _playlist list of audio tracks contained by this playlist
   * @param _index current index of the playlist
   */
  constructor(private _playlist: Media[] = [], private _index = 0) {}

  /** Get the current track */
  get current() {
    return this._playlist[this._index];
  }

  /** Change to the next item in the playlist */
  public next() {}

  /** Change to the previous item in the playlist */
  public previous() {}
}
