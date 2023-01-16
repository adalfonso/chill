import { Base } from "./Base.js";
import { index, prop } from "@typegoose/typegoose";
import { Nullable } from "@common/types.js";

export class AlbumCover {
  @prop({ required: true })
  public filename!: string;

  @prop({ required: true })
  public format!: string;

  @prop({ required: true })
  public data!: string;

  @prop({ required: true })
  public type!: string;
}

@index({
  artist: "text",
  album: "text",
  title: "text",
  genre: "text",
})
export class Media extends Base {
  @prop({ required: true, index: true })
  public path!: string;

  @prop({ required: true })
  public duration!: number;

  @prop({ default: null })
  public artist!: Nullable<string>;

  @prop({ default: null })
  public album!: Nullable<string>;

  @prop({ default: null })
  public title!: Nullable<string>;

  @prop({ default: null })
  public track!: Nullable<number>;

  @prop({ default: null })
  public genre!: Nullable<string>;

  @prop({ default: null })
  public year!: Nullable<number>;

  @prop({ default: null })
  public cover!: Nullable<AlbumCover>;

  @prop({ required: true })
  public file_modified!: Date;

  @prop({ required: true })
  public file_type!: string;
}
