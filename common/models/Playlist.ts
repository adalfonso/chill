import { Base } from "./Base";
export interface Playlist extends Base {
  name: string;

  items: string[];
}
