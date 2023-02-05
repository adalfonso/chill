import * as _ from "lodash-es";
import { useRef } from "react";

export const useId = () => useRef(_.uniqueId()).current;
