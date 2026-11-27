import type { Box } from "./slide";

export type ImageSize = { width: number; height: number };

/** Reads pixel dimensions from PNG or JPEG headers (no decoding). */
export function imageSize(bytes: Uint8Array): ImageSize | null {
  if (
    bytes.length > 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = bytes[i + 1];
      const length = (bytes[i + 2] << 8) | bytes[i + 3];
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      )
        return {
          height: (bytes[i + 5] << 8) | bytes[i + 6],
          width: (bytes[i + 7] << 8) | bytes[i + 8],
        };
      i += 2 + length;
    }
  }
  return null;
}

/**
 * srcRect (in 1/1000 of a percent) that makes an image cover its frame
 * without distortion, cropping the overflow equally on both sides.
 */
export function coverCrop(size: ImageSize, frame: Box) {
  const imageRatio = size.width / size.height;
  const frameRatio = frame.cx / frame.cy;
  if (!Number.isFinite(imageRatio) || !Number.isFinite(frameRatio) || frame.cy === 0)
    return { l: 0, t: 0, r: 0, b: 0 };
  if (imageRatio > frameRatio) {
    const keep = frameRatio / imageRatio;
    const side = Math.round(((1 - keep) / 2) * 100000);
    return { l: side, t: 0, r: side, b: 0 };
  }
  const keep = imageRatio / frameRatio;
  const side = Math.round(((1 - keep) / 2) * 100000);
  return { l: 0, t: side, r: 0, b: side };
}

/** Decodes a `data:image/png|jpeg;base64,` URL registered as a local resource. */
export function decodeDataUrl(
  url: string,
): { bytes: Uint8Array; contentType: "image/png" | "image/jpeg" } | null {
  const m = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=\s]+)$/.exec(url.trim());
  if (!m) return null;
  const bin = atob(m[2].replace(/\s/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  if (!imageSize(bytes)) return null;
  return { bytes, contentType: m[1] as "image/png" | "image/jpeg" };
}
