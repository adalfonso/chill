import "./FileInfo.scss";
import { Close } from "@client/components/ui/Close";
import { Media } from "@common/models/Media";
import { noPropagate, secondsToMinutes } from "@client/lib/util";
import { useMenu } from "@hooks/index";

interface FileInfoProps {
  menu_id: string;
  file: Media;
}

export const FileInfo = ({ file, menu_id }: FileInfoProps) => {
  const menu = useMenu(menu_id);

  return (
    <div className="fullscreen center-content" onClick={noPropagate()}>
      <Close onClose={noPropagate(menu.clear)}></Close>
      <div id="file-info">
        <table>
          <thead>
            <tr></tr>
          </thead>
          <tbody>
            <tr>
              <td>Artist</td>
              <td>{file.artist}</td>
            </tr>
            <tr>
              <td>Title</td>
              <td>{file.title}</td>
            </tr>
            <tr>
              <td>Track #</td>
              <td>{file.track}</td>
            </tr>
            <tr>
              <td>Album</td>
              <td>{file.album}</td>
            </tr>
            <tr>
              <td>Year</td>
              <td>{file.year}</td>
            </tr>
            <tr>
              <td>Genre</td>
              <td>{file.genre}</td>
            </tr>
            <tr>
              <td>Duration</td>
              <td>{secondsToMinutes(file.duration)}</td>
            </tr>
            <tr>
              <td>Path</td>
              <td>{file.path}</td>
            </tr>

            <tr>
              <td>File Type</td>
              <td>{file.file_type.toUpperCase()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
