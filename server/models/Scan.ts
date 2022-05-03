import * as mongoose from "mongoose";

const { Schema } = mongoose;

export const ScanSchema = new Schema({
  status: {
    type: String,
    enum: ["ACTIVE", "FAILED", "COMPLETED"],
    default: "ACTIVE",
  },
  records_written: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  completed_at: { type: Date, default: null },
});

export const ScanModel = mongoose.model("Scan", ScanSchema, "scans");
