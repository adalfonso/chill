import mongoose from "mongoose";

export interface Base {
  _id: string;
  created_at: Date;
  updated_at: Date;
}
