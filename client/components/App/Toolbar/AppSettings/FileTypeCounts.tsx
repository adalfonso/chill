import { api } from "@client/client";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { FileTypeGraph } from "./FileTypeGraph";

export const FileTypeCounts = () => {
  const fileTypeCounts = useSignal({} as Record<string, number>);

  useEffect(() => {
    api.media.byFileType
      .query()
      .then((result) => (fileTypeCounts.value = result));
  }, []);

  return (
    <>
      {" "}
      {Object.keys(fileTypeCounts.value).length && (
        <FileTypeGraph data={fileTypeCounts} />
      )}
    </>
  );
};
