import { Media } from "@common/autogen";

/** Keeps track of all audio tracks under a given domain */
export class Playlist {
  /**
   * @param _playlist list of audio tracks contained by this playlist
   * @param _index current index of the playlist
   */
  constructor(private _playlist: Media[] = [], private _index = 0) {
    /**
     * Handle out of bounds starting index
     *
     * This will happen when we are implicitly perfoming a "next" or "previous"
     * play action by creating a new playlist from the current playlist with the
     * index incremented/decremented
     */
    if (_index >= _playlist.length) {
      this._index = 0;
    } else if (_index < 0 && _playlist.length) {
      this._index = this._playlist.length - 1;
    }
  }

  /** Get the current track */
  get current() {
    return this._playlist[this._index];
  }

  get current_index() {
    return this._index;
  }

  get has_next_track() {
    return this._index < this._playlist.length - 1;
  }

  get items() {
    return this._playlist;
  }

  /** Change to the next item in the playlist */
  public next() {
    this._index++;

    if (this._index === this._playlist.length) {
      this._index = 0;
    }
  }

  /** Change to the previous item in the playlist */
  public previous() {
    this._index--;

    if (this._index < 0) {
      this._index = this._playlist.length - 1;
    }
  }
}
