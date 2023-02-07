import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { MouseEvent } from "react";
import { SizeProp } from "@fortawesome/fontawesome-svg-core";
import { faClose } from "@fortawesome/free-solid-svg-icons";

interface CloseProps {
  onClose: (e: MouseEvent<HTMLElement>) => void;
  size?: SizeProp;
}

export const Close = ({ onClose, size = "lg" }: CloseProps) => {
  return (
    <div className="close" onClick={onClose}>
      <Icon icon={faClose} size={size} />
    </div>
  );
};
