import { Media } from "@common/models/Media";

export type TileData = Partial<Omit<Media, "_id">> & {
  _id: Record<string, string>;
  _count: number;
  image?: string;
};
