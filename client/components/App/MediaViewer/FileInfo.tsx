import "./FileInfo.scss";
import { Close } from "@client/components/ui/Close";
import { PlayableTrack } from "@common/types";
import { getFileTypeFromPath } from "@common/commonUtils";
import { noPropagate } from "@client/lib/Event";
import { secondsToMinutes } from "@client/lib/AudioProgress";
import { useMenu } from "@hooks/index";

type FileInfoProps = {
  menu_id: string;
  file: PlayableTrack;
};

export const FileInfo = ({ file, menu_id }: FileInfoProps) => {
  const menu = useMenu(menu_id);

  return (
    <div className="fullscreen center-content" onClick={noPropagate()}>
      <div>
        <Close onClose={noPropagate(menu.clear)} />
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
                <td>{file.number}</td>
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
                <td>{getFileTypeFromPath(file.path)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
