import { api } from "@client/client";
import { AlbumBitrateStats } from "@common/types";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

export const LowQualityAlbums = () => {
  const albums = useSignal<Array<AlbumBitrateStats>>([]);

  useEffect(() => {
    api.libraryHealth.lowQualityAlbums.query().then((data) => {
      albums.value = data;
    });
  }, []);

  return (
    <div className="setting-low-quality-albums setting">
      <h2>Lowest quality albums</h2>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>kbps</th>
            <th>Title</th>
            <th>Tracks</th>
            <th>Year</th>
          </tr>
        </thead>

        <tbody>
          {albums.value.map((album, i) => {
            return (
              <tr key={album.id}>
                <td>{i + 1}</td>
                <td>{Math.round(album.avg_bitrate_kbps)}</td>
                <td>{album.title}</td>
                <td>{album.track_count}</td>
                <td>{album.year || ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
