import { useRef } from "react";

import { uniqueId } from "@common/commonUtils";

export const useId = () => useRef(uniqueId()).current;
