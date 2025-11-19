import { AppSettingType as SettingType } from "@client/types";
import { useAppState } from "@hooks/useAppState";

type AppSettingProps = {
  id: SettingType;
  title: string;
  children?: React.ReactNode;
};

export const AppSetting = ({ id, title }: AppSettingProps) => {
  const { current_app_setting } = useAppState();
  const is_selected = current_app_setting.value === id;

  const onClick = () => (current_app_setting.value = id);

  return (
    <>
      <div
        className={`app-setting ${is_selected ? "selected" : ""}`}
        onClick={onClick}
      >
        {title}
      </div>
    </>
  );
};
