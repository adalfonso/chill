import "./Settings.scss";
import { FontAwesomeIcon as Icon } from "@fortawesome/react-fontawesome";
import { faClose } from "@fortawesome/free-solid-svg-icons";

interface UserSettingsProps {
  setVis: () => void;
}

export const UserSettings = ({ setVis: onClose }: UserSettingsProps) => {
  return (
    <div id="settings">
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
