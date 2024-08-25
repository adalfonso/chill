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
