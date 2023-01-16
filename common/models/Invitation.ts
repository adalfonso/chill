import { Base } from "./Base.js";
import { prop } from "@typegoose/typegoose";

export class Invitation extends Base {
  @prop({ required: true, unique: true, index: true })
  public email!: string;
}
