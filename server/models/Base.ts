import { Document } from "mongoose";

export const timestamps = {
  createdAt: "created_at",
  updatedAt: "updated_at",
};

export type Doc<T> = Document<unknown, any, T> & T & Required<{ _id: string }>;
