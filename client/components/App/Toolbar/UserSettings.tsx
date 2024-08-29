import "./UserSettings.scss";
import { Close } from "@client/components/ui/Close";

type UserSettingsProps = {
  setVis: () => void;
};

export const UserSettings = ({ setVis: onClose }: UserSettingsProps) => {
  return (
    <div id="user-settings">
      <Close onClose={onClose} />
      <div>
        <a className="regular" href="/auth/logout">
          Log Out
        </a>
      </div>
    </div>
  );
};
