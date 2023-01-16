import mongoose from "mongoose";

export class Base {
  public _id: mongoose.Types.ObjectId;
  public created_at: Date;
  public updated_at: Date;
}
