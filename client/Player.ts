import { Media } from "@server/models/autogen";
import { Nullable } from "@server/types";
import { Playlist } from "./Playlist";

export class Player {
  private static _instance;
  private _is_playing = false;

  private _current: Nullable<Media>;

  constructor(private _ctx: AudioContext, private _playlist: Playlist) {}

  public static create() {
    return new Player(new AudioContext(), new Playlist());
  }

  public static instance() {
    if (!Player._instance) {
      Player._instance = Player.create();
    }

    return this._instance;
  }

  get is_playing() {
    return this._is_playing;
  }

  public play() {}

  public pause() {}

  public next() {}

  public previous() {}

  public scrubTo() {}

  public setPlaylist(playlist: Playlist) {
    this._playlist = playlist;
  }
}
