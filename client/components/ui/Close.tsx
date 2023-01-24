import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { faClose } from "@fortawesome/free-solid-svg-icons";
import { MouseEvent } from "react";

interface CloseProps {
  onClose: (e: MouseEvent<SVGSVGElement>) => void;
}

export const Close = ({ onClose }: CloseProps) => {
  return (
    <div className="close">
      <Icon icon={faClose} size="lg" onClick={onClose} />
    </div>
  );
};
