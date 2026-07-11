export type HairstyleCategory =
  | "short"
  | "medium"
  | "long"
  | "curly"
  | "bangs"
  | "mens"
  | "neutral";

export type Hairstyle = {
  id: string;
  name: string;
  category: HairstyleCategory;
  tags: string[];
  description: string;
  previewColor: string;
};

export type PhotoAsset = {
  dataUrl: string;
  source: "camera" | "gallery" | "sample";
};

export type TryOnRequest = {
  photoDataUrl: string;
  hairstyleId: string;
};

export type TryOnResult = {
  resultDataUrl: string;
  provider: "local-preview" | "remote-ai";
  createdAt: string;
};
