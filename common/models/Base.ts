import mongoose from "mongoose";

export interface Base {
  _id: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export class Base {
  public _id!: mongoose.Types.ObjectId;
  public created_at!: Date;
  public updated_at!: Date;
}
