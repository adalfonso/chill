import { Media } from "@server/models/autogen";

export class Playlist {
  constructor(private _playlist: Media[] = [], private _index = 0) {}

  public next() {}

  public previous() {}
}
