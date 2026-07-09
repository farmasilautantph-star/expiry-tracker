/**
 * Client-side image compression for push-item product photos.
 * Downscales to a max dimension and re-encodes as JPEG so the base64
 * data URL stays small enough to store in a TEXT column (< ~300KB typical).
 */
export async function fileToCompressedDataUrl(
  file: File,
  maxDim = 800,
  quality = 0.72,
): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    throw new Error("Please select a JPG or PNG image");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read image file"));
      el.src = objectUrl;
    });

    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process image");
    // White backdrop so transparent PNGs don't turn black in JPEG
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
