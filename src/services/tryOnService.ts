import { hairstyles } from "../data/hairstyles";
import type { TryOnRequest, TryOnResult } from "../types";

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function escapeSvgAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function tryOnHairstyle(request: TryOnRequest): Promise<TryOnResult> {
  if (!request.photoDataUrl) {
    throw new Error("请选择照片后再生成");
  }

  const style = hairstyles.find((item) => item.id === request.hairstyleId);

  if (!style) {
    throw new Error("请选择一个发型后再生成");
  }

  await delay(650);

  const photoDataUrl = escapeSvgAttribute(request.photoDataUrl);
  const previewColor = escapeSvgAttribute(style.previewColor);
  const styleName = escapeSvgAttribute(style.name);

  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#f4f1ec"/>
          <stop offset="100%" stop-color="#d9ebe7"/>
        </linearGradient>
      </defs>
      <rect width="900" height="1200" fill="url(#bg)"/>
      <image href="${photoDataUrl}" x="110" y="140" width="680" height="760" preserveAspectRatio="xMidYMid slice"/>
      <ellipse cx="450" cy="325" rx="235" ry="150" fill="${previewColor}" opacity="0.88"/>
      <path d="M230 340 C230 210 670 210 670 340 L620 650 C550 720 350 720 280 650 Z" fill="${previewColor}" opacity="0.78"/>
      <rect x="110" y="900" width="680" height="150" rx="34" fill="#ffffff" opacity="0.92"/>
      <text x="450" y="965" text-anchor="middle" font-size="38" font-family="Arial, sans-serif" fill="#191817">${styleName}</text>
      <text x="450" y="1018" text-anchor="middle" font-size="24" font-family="Arial, sans-serif" fill="#68615b">本地 AI 试发型预览</text>
    </svg>
  `);

  return {
    resultDataUrl: `data:image/svg+xml;charset=utf-8,${svg}`,
    provider: "local-preview",
    createdAt: new Date().toISOString(),
  };
}
