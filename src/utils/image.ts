const TARGET_WIDTH = 1440;
const SKIP_BELOW_BYTES = 1_200_000;

/**
 * Downscales and re-encodes an image file in the browser before it is held in
 * form state or uploaded. Phone cameras produce 10-15 MP JPEGs of several
 * megabytes; keeping a few of those in memory (plus their object-URL previews)
 * is enough to get the tab evicted for "insufficient memory" on low-RAM devices
 * right after the camera app returns.
 *
 * The resize happens *during decode* via `createImageBitmap` options, so the
 * full-resolution bitmap (~48 MB for a 12 MP photo) never lands in memory —
 * only the ~1440 px result does. Files already under {@link SKIP_BELOW_BYTES},
 * non-raster files, and anything that fails to decode (e.g. HEIC without browser
 * support) are returned unchanged.
 */
export async function downscaleImage(
  file: File,
  targetWidth = TARGET_WIDTH,
  quality = 0.75
): Promise<File> {
  if (!file.type.startsWith('image/') || typeof createImageBitmap !== 'function') {
    return file;
  }
  if (file.size < SKIP_BELOW_BYTES) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, {
      resizeWidth: targetWidth,
      resizeQuality: 'medium',
    });
  } catch {
    return file;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return file;
    }
    ctx.drawImage(bitmap, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });

    canvas.width = 0;
    canvas.height = 0;

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}
