import { Base } from "./Base.js";
import { index, mongoose, prop } from "@typegoose/typegoose";

@index({ name: "text" })
export class Playlist extends Base {
  @prop({ required: true, index: true, unique: true })
  public name!: string;

  @prop({ required: true, default: [] })
  public items!: mongoose.Types.ObjectId[];
}
