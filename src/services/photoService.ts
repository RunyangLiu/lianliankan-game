import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import type { PhotoAsset } from "../types";

const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isSupportedImageType(type: string): boolean {
  return supportedTypes.has(type);
}

export function isSupportedImageDataUrl(dataUrl: string): boolean {
  const match = dataUrl.match(/^data:([^;,]+)[;,]/);

  return match ? isSupportedImageType(match[1]) : false;
}

export function readImageFile(file: File): Promise<PhotoAsset> {
  if (!isSupportedImageType(file.type)) {
    return Promise.reject(new Error("请选择 JPG、PNG 或 WebP 图片"));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve({ dataUrl: reader.result, source: "gallery" });
      } else {
        reject(new Error("没有读取到图片内容"));
      }
    });
    reader.addEventListener("error", () => reject(new Error("图片读取失败，请重新选择")));
    reader.readAsDataURL(file);
  });
}

function normalizeCameraError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("permission") ||
    normalizedMessage.includes("denied") ||
    normalizedMessage.includes("unauthorized")
  ) {
    return new Error("没有相机或相册权限，可以在系统设置里开启");
  }

  if (
    normalizedMessage.includes("cancel") ||
    normalizedMessage.includes("cancelled") ||
    normalizedMessage.includes("canceled") ||
    normalizedMessage.includes("no photo")
  ) {
    return new Error("没有拿到照片，可以重新选择");
  }

  return new Error("照片读取失败，请重新选择");
}

export async function pickPhotoFromDevice(source: "camera" | "gallery"): Promise<PhotoAsset> {
  let photo;

  try {
    photo = await Camera.getPhoto({
      quality: 88,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
    });
  } catch (error) {
    throw normalizeCameraError(error);
  }

  if (!photo.dataUrl) {
    throw new Error("没有拿到照片，可以重新选择");
  }

  if (!isSupportedImageDataUrl(photo.dataUrl)) {
    throw new Error("请选择 JPG、PNG 或 WebP 图片");
  }

  return { dataUrl: photo.dataUrl, source };
}
