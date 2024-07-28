import sharp from "sharp";

type ImageOptions = {
  size: number;
  quality: number;
};

/**
 * Adjust the size/quality of an image
 *
 * @param data image data
 * @param options resize options
 * @returns new image buffer
 */
export const adjustImage = async (
  data: string,
  options: Partial<ImageOptions>,
) => {
  const { size, quality } = options;

  const buffer = Buffer.from(data, "base64");

  if (size === undefined) {
    return buffer;
  }

  return sharp(buffer).resize(size).jpeg({ quality }).toBuffer();
};
