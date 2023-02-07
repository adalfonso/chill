import { Invitation as IInvitation } from "@common/models/Invitation";
import { model, Schema } from "mongoose";
import { timestamps } from "./Base";

const InvitationSchema = new Schema<IInvitation>(
  {
    email: { type: String, required: true, unique: true },
  },
  { timestamps, collection: "invitation" },
);

export const Invitation = model<IInvitation>("Invitation", InvitationSchema);
