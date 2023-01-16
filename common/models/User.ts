import { Base } from "./Base.js";
import { prop } from "@typegoose/typegoose";

export enum UserType {
  User = "user",
  Admin = "admin",
}

enum AudioQuality {
  Original = "original",
  _85 = "85",
  _115 = "115",
  _165 = "165",
  _190 = "190",
  _245 = "245",
}

export class UserSettings {
  @prop({ default: AudioQuality.Original })
  public audio_quality: AudioQuality;
}

export class UserAuth {
  @prop()
  public id: string;

  @prop()
  public name: string;

  @prop()
  public email: string;

  @prop()
  public access_token: string;

  @prop()
  public type: "google_oauth";
}

export class User extends Base {
  @prop({ required: true, unique: true, index: true })
  public email!: string;

  @prop({ required: true, default: UserType.User })
  public type!: UserType;

  @prop()
  public settings: UserSettings;

  @prop()
  public auth: UserAuth;
}
