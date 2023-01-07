import mongoose from "mongoose";

const { Schema } = mongoose;

const InvitationSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

export const Invitation = mongoose.model("Invitation", InvitationSchema);
