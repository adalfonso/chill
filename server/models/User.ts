import mongoose from "mongoose";

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    auth: {
      id: String,
      name: String,
      email: String,
      access_token: String,
      type: {
        type: String,
        enum: ["google_oauth"],
        default: "google_oauth",
      },
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

export const User = mongoose.model("User", UserSchema);
