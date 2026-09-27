// Loads an organisation logo from a URL and draws it onto a jsPDF document at
// (x, y), scaled to fit within maxW x maxH while preserving aspect ratio.
// Returns the drawn height in pt (0 when there is no logo or loading failed),
// so callers can shift the following content below the logo.
export async function drawOrgLogo(doc, logoUrl, x, y, maxW, maxH) {
  if (!logoUrl) return 0;
  try {
    const res = await fetch(logoUrl);
    if (!res.ok) return 0;
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dims = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
    if (!dims.w || !dims.h) return 0;
    const ratio = Math.min(maxW / dims.w, maxH / dims.h);
    const drawW = dims.w * ratio;
    const drawH = dims.h * ratio;
    const fmt = /jpe?g/i.test(blob.type) ? "JPEG" : "PNG";
    doc.addImage(dataUrl, fmt, x, y, drawW, drawH);
    return drawH;
  } catch {
    return 0;
  }
}