import { useState } from "react";

interface RadioOption {
  name: string;
  value: string;
}

interface RadioProps {
  default_value: string;
  options: RadioOption[];
  onChange: (value: string) => void;
}

export const Radio = ({ default_value, options, onChange }: RadioProps) => {
  const [selected_option, setSelectedOption] = useState(default_value);

  const changeValue = (value: string) => () => {
    onChange(value);
    setSelectedOption(value);
  };

  // TODO: should this be strict?
  const isSelected = (value: string) => selected_option == value;

  return (
    <div className="ui-radio">
      {options.map(({ name, value }) => (
        <div
          onClick={changeValue(value)}
          className={isSelected(value) ? "active" : ""}
          key={value}
        >
          {name}
        </div>
      ))}
    </div>
  );
};
