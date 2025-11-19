import fs from "node:fs/promises";

/**
 * Makes a directory if id doesn't already exists
 *
 * @param dir - directory path
 * @throws if it fails to create the directory
 */
export const makeDirIfNotExists = async (dir: string) => {
  try {
    await fs.access(dir);
  } catch (err) {
    try {
      await fs.mkdir(dir);
    } catch (err) {
      console.error(`Failed to create dir at ${dir}`);
    }
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 0 || isNaN(bytes)) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  const rounded = size % 1 === 0 ? size.toFixed(0) : size.toFixed(2);

  return `${rounded} ${units[unitIndex]}`;
};
