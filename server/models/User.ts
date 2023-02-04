import { AudioQuality, UserType } from "@common/types";
import { User as IUser } from "@common/models/User";
import { model, Schema } from "mongoose";
import { timestamps } from "./Base";

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: Object.values(UserType),
      default: UserType.User,
      required: true,
    },
    settings: {
      audio_quality: {
        type: String,
        enum: Object.values(AudioQuality),
        default: AudioQuality.Original,
        required: true,
      },
    },
    auth: {
      id: String,
      name: String,
      email: String,
      access_token: String,
      type: {
        type: String,
        enum: ["google_oauth"],
      },
    },
  },
  { timestamps, collection: "user" },
);

export const User = model<IUser>("User", UserSchema);
