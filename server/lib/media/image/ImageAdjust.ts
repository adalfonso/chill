import sharp from "sharp";

type ImageOptions = {
  size: number;
  quality: number;
};

/**
 * Adjust the size/quality of an image
 *
 * Accepts `Uint8Array` (not just `Buffer`) because Prisma's `Bytes` scalar
 * is typed as `Uint8Array`, even though the value is a real `Buffer` at
 * runtime — sharp already supports `Uint8Array` input directly, so callers
 * reading Prisma `Bytes` fields don't need to convert.
 *
 * @param data image data
 * @param options resize options
 * @returns resized/compressed image buffer
 */
export const adjustImage = async (
  data: Uint8Array,
  options: ImageOptions,
): Promise<Buffer> => {
  const { size, quality = 100 } = options;

  // Use sharp for resizing and quality adjustment
  return sharp(data).resize(size).jpeg({ quality }).toBuffer();
};
