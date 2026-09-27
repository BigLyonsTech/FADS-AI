// Minimal Android/webview compatibility helpers for share + print actions.
// Desktop browsers keep their normal behaviour; installed app webviews fall
// back to opening a viewer/external app where the native action is unavailable.

// Heuristic: are we inside an installed app webview rather than a normal
// browser tab? Conservative — only true for actual webview/standalone contexts
// so desktop browsers are never affected.
export function isAppWebview() {
  if (typeof window === "undefined" || !navigator) return false;
  const ua = navigator.userAgent || "";
  // Android System WebView includes "; wv)" in its user agent.
  if (/android/i.test(ua) && /wv/i.test(ua)) return true;
  // iOS WKWebView / installed standalone PWA.
  if (window.navigator.standalone === true) return true;
  if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
  return false;
}

// Open a WhatsApp share URL. In browsers this opens a new tab (WhatsApp Web or
// the WhatsApp app). In app webviews target=_blank anchors are swallowed, so we
// try window.open first and fall back to navigating the webview — which the
// host forwards to the external WhatsApp app, or WhatsApp Web if the app is
// not installed.
export function openWhatsAppShare(url) {
  const opened = window.open(url, "_blank");
  if (!opened) {
    window.location.href = url;
  }
}

// Print, or — where the native print dialog is unavailable inside an app
// webview — open the printable PDF in an external viewer so the user can
// print or save it. `openPdf` is called only in the webview fallback case.
export function printOrPdf(openPdf) {
  if (isAppWebview() && typeof openPdf === "function") {
    openPdf();
    return;
  }
  window.print();
}

// Show a visible, dismissible "Open PDF in browser" banner with a data URL.
// Used only as a last resort inside an installed Android webview when the
// native share sheet cannot launch — so the user is never left with nothing.
function showPdfFallbackLink(dataUrl, filename) {
  const existing = document.getElementById("fads-pdf-fallback");
  if (existing) existing.remove();

  const banner = document.createElement("div");
  banner.id = "fads-pdf-fallback";
  banner.style.cssText =
    "position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#0f172a;color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-family:system-ui,sans-serif;box-shadow:0 -4px 16px rgba(0,0,0,.3)";

  const text = document.createElement("span");
  text.textContent = "PDF ready — your device blocked automatic open.";
  text.style.cssText = "font-size:13px;flex:1";

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "Open PDF in browser";
  link.style.cssText =
    "background:#1a8a8a;color:#0f172a;font-weight:600;font-size:13px;padding:8px 14px;border-radius:8px;text-decoration:none;white-space:nowrap";

  const close = document.createElement("button");
  close.textContent = "✕";
  close.style.cssText =
    "background:transparent;color:#fff;font-size:16px;border:0;cursor:pointer;padding:4px 8px";
  close.onclick = () => banner.remove();

  banner.appendChild(text);
  banner.appendChild(link);
  banner.appendChild(close);
  document.body.appendChild(banner);
}

// Hand a generated jsPDF document to the user.
//
// Desktop / mobile browser: preserves the existing behaviour exactly —
// `openInTab` opens the PDF in a new tab (falling back to a direct download),
// otherwise a direct download via doc.save().
//
// Installed Android webview: blob: URLs and <a download> are silently
// blocked, so the PDF is handed to the native Android share sheet via the
// Web Share API (files), where the user can save it or open it in a PDF
// viewer. If the share sheet cannot launch, a visible "Open PDF in browser"
// fallback link is shown instead of doing nothing.
export async function deliverPdf(doc, filename, { openInTab = false } = {}) {
  if (!isAppWebview()) {
    if (openInTab) {
      const blobUrl = doc.output("bloburl");
      const opened = window.open(blobUrl, "_blank");
      if (!opened) doc.save(filename);
    } else {
      doc.save(filename);
    }
    return { ok: true };
  }

  const blob = doc.output("blob");
  const file = new File([blob], filename, { type: "application/pdf" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return { ok: true };
    } catch (err) {
      // user dismissed the sheet — fall through to the visible fallback
    }
  }

  showPdfFallbackLink(doc.output("datauristring"), filename);
  return { ok: false, fallback: true };
}