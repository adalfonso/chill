import { Signal } from "@preact/signals";

type FileTypeGraphProps = {
  data: Signal<Record<string, number>>;
};

export const FileTypeGraph = ({ data }: FileTypeGraphProps) => {
  const total = Object.values(data.value).reduce(
    (carry, count) => carry + count,
    0,
  );

  return (
    <div className="file-type-graph setting">
      {Object.entries(data.value).map(([file_type, count], i, arr) => {
        const percent = (count / total) * 100;

        const backgroundColor = 255 / (i + 1);
        const color = backgroundColor > 127 ? 20 : 235;

        const style = {
          color: `rgb(${color}, ${color}, ${color})`,
          backgroundColor: `rgb(${backgroundColor}, ${backgroundColor}, ${backgroundColor})`,
          width: `${(count / total) * 100}%`,
        };

        return (
          <div key={file_type} style={style}>
            {file_type}
            <br />
            {percent < 1 ? `<1` : Math.round(percent)}%
          </div>
        );
      })}
    </div>
  );
};
