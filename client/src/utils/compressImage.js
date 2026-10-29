/**
 * Shrink a photo in the browser before upload: longest side ≤ maxSide, JPEG.
 *
 * Review photos came straight off phone cameras (2–4 MB each); one of them was
 * 2.4 MB of the Wooden Katana product page. A 1200 px JPEG at 0.82 is ~50–150 KB
 * and looks the same in the review carousel and lightbox.
 *
 * Never throws: if the browser can't decode the file (e.g. HEIC on Chrome) or
 * the result isn't smaller, the original file is returned unchanged.
 */
export async function compressImage(file, { maxSide = 1200, quality = 0.82 } = {}) {
  if (!file?.type?.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; // transparent PNG areas would turn black in JPEG
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}
