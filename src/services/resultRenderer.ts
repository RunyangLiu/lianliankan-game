export function buildResultDownloadName(
  hairstyleId: string,
  dataUrl: string,
  date = new Date(),
): string {
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, "");
  const extension = getImageExtension(dataUrl);
  return `ai-hairstyle-${hairstyleId}-${stamp}.${extension}`;
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
}

function getImageExtension(dataUrl: string): "svg" | "png" | "jpg" | "webp" {
  const mimeType = dataUrl.match(/^data:([^;,]+)/i)?.[1].toLowerCase();

  switch (mimeType) {
    case "image/svg+xml":
      return "svg";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/png":
    default:
      return "png";
  }
}
