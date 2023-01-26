import { ObjectId } from "bson";
import { useRef } from "react";

export const useObjectId = () => useRef(new ObjectId().toString()).current;
