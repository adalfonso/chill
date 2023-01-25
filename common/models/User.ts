import { AudioQuality, UserType } from "../types.js";
import { Base } from "./Base.js";
import { prop } from "@typegoose/typegoose";

export class UserSettings {
  @prop({ default: AudioQuality.Original })
  public audio_quality?: AudioQuality;
}

export class UserAuth {
  @prop()
  public id?: string;

  @prop()
  public name?: string;

  @prop()
  public email?: string;

  @prop()
  public access_token?: string;

  @prop()
  public type?: "google_oauth";
}

export class User extends Base {
  @prop({ required: true, unique: true, index: true })
  public email!: string;

  @prop({ required: true, default: UserType.User })
  public type!: UserType;

  @prop()
  public settings?: UserSettings;

  @prop()
  public auth?: UserAuth;
}
