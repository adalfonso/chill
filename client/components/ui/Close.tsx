import { MouseEvent } from "react";

import { XIcon } from "./icons/XIcon";

type CloseProps = {
  onClose: (e: MouseEvent<HTMLElement>) => void;
  size?: "xxs" | "xs" | "sm";
};

export const Close = ({ onClose, size = "sm" }: CloseProps) => {
  return (
    <div className="close" onClick={onClose}>
      <XIcon className={`icon-${size}`} />
    </div>
  );
};
