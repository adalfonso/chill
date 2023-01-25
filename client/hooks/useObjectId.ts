import { ObjectID } from "bson";
import { useRef } from "react";

export const useObjectId = () => useRef(new ObjectID().toString()).current;
