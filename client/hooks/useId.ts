import { useRef } from "preact/hooks";

import { uniqueId } from "@common/commonUtils";

export const useId = () => useRef(uniqueId()).current;
