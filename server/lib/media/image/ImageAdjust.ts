import sharp from "sharp";

type ImageOptions = {
  size: number;
  quality: number;
};

/**
 * Adjust the size/quality of an image
 *
 * @param data image data Buffer
 * @param options resize options
 * @returns resized/compressed image buffer
 */
export const adjustImage = async (
  data: Buffer,
  options: ImageOptions,
): Promise<Buffer> => {
  const { size, quality = 100 } = options;

  // Accept either a Buffer or base64 string
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, "base64");

  // Use sharp for resizing and quality adjustment
  return sharp(buffer).resize(size).jpeg({ quality }).toBuffer();
};
