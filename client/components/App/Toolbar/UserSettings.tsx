import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { faClose } from "@fortawesome/free-solid-svg-icons";

import "./UserSettings.scss";

type UserSettingsProps = {
  setVis: () => void;
};

export const UserSettings = ({ setVis: onClose }: UserSettingsProps) => {
  return (
    <div id="user-settings">
      <div className="close">
        <Icon icon={faClose} size="lg" onClick={onClose} />
      </div>
      <div>
        <a className="regular" href="/auth/logout">
          Log Out
        </a>
      </div>
    </div>
  );
};
