import { Album, Playlist, Track } from "@prisma/client";
import { SortClause } from "./schema";

export type Maybe<T> = T | null;
export type ObjectValues<T> = T[keyof T];
export type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

export type SearchResult = {
  type: MediaTileType | "track";
  value: string;
  displayAs: string[];
  path: string;
};

export type MediaTileData<
  T extends Record<string, unknown> = Record<string, never>,
> = {
  id: number;
  name: string;
  image?: Maybe<string>;
  data?: T;
};

export const MediaTileType = {
  Artist: "artist",
  Album: "album",
  Genre: "genre",
} as const;

export type MediaTileType = ObjectValues<typeof MediaTileType>;

export type AlbumMetadata = {
  year: Album["year"];
};

export type AlbumRelationalData = {
  album_art: {
    filename: string;
  } | null;

  artist: {
    name: string;
  } | null;
};

export type PlayableTrack = Pick<
  Track,
  "id" | "artist_id" | "album_id" | "title" | "path" | "number"
> & {
  artist: Maybe<string>;
  album: Maybe<string>;
  album_art_filename: Maybe<string>;
  year: Maybe<number>;
  genre: Maybe<string>;
  duration: number;
};

export type PlayableTrackWithIndex = PlayableTrack & { _index: string };

export type PlaylistWithCount = Playlist & { track_count: number };

export const SortOrder = {
  asc: "asc",
  desc: "desc",
} as const;

export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];

export type PaginationOptions = {
  limit: number;
  page: number;
  sort: Array<SortClause>;
};

export const AudioQualityBitrate = {
  Original: "original",
  Trash: "85",
  Low: "115",
  Medium: "165",
  Standard: "190",
  Extreme: "245",
} as const;

export type AudioQualityBitrate = ObjectValues<typeof AudioQualityBitrate>;

// TODO: Importing prisma enum breaks prod bundle
export const AudioQuality = {
  Original: "Original",
  Trash: "Trash",
  Low: "Low",
  Medium: "Medium",
  Standard: "Standard",
  Extreme: "Extreme",
} as const;

export type AudioQuality = ObjectValues<typeof AudioQuality>;

// TODO: Importing prisma enum breaks prod bundle
export const UserType = {
  Admin: "Admin",
  User: "User",
} as const;

export type UserType = ObjectValues<typeof UserType>;

// Converts Date to string
export type Raw<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends object
      ? Raw<T[K]>
      : T[K];
};
