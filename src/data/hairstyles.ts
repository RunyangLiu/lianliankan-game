import type { Hairstyle, HairstyleCategory } from "../types";

export type HairstyleFilterCategory = HairstyleCategory | "all";

export const categoryLabels: Record<HairstyleFilterCategory, string> = {
  all: "全部",
  short: "短发",
  medium: "中长发",
  long: "长发",
  curly: "卷发",
  bangs: "刘海",
  mens: "男士",
  neutral: "中性风",
};

export const hairstyles: Hairstyle[] = [
  { id: "short-pixie", name: "清爽精灵短发", category: "short", tags: ["利落", "轻盈"], description: "适合想突出五官和颈部线条的短发预览。", previewColor: "#2f4f4f" },
  { id: "short-bob", name: "法式齐颌短发", category: "short", tags: ["通勤", "自然"], description: "轮廓干净，适合第一次尝试短发的人。", previewColor: "#5a3e36" },
  { id: "short-layer", name: "层次耳下短发", category: "short", tags: ["层次", "蓬松"], description: "带一点空气感，修饰头型和脸侧。", previewColor: "#7b4a31" },
  { id: "medium-lob", name: "锁骨中长发", category: "medium", tags: ["百搭", "温柔"], description: "长度安全，适合多数脸型的日常发型。", previewColor: "#6b4f3f" },
  { id: "medium-layer", name: "韩系层次中长发", category: "medium", tags: ["修饰", "轻熟"], description: "脸侧层次更明显，适合想要柔和轮廓的人。", previewColor: "#4b362f" },
  { id: "medium-straight", name: "自然直中长发", category: "medium", tags: ["简洁", "学生"], description: "保留自然垂顺感，变化稳妥。", previewColor: "#2f2a28" },
  { id: "long-wave", name: "大波浪长发", category: "long", tags: ["氛围", "优雅"], description: "增加发量感和成熟气质。", previewColor: "#57382f" },
  { id: "long-straight", name: "黑长直", category: "long", tags: ["经典", "干净"], description: "经典长直发预览，强调发质和长度。", previewColor: "#1f1d1b" },
  { id: "long-layer", name: "层次长发", category: "long", tags: ["轻盈", "自然"], description: "保留长度，同时减少厚重感。", previewColor: "#8a5a3b" },
  { id: "curly-soft", name: "自然软卷", category: "curly", tags: ["蓬松", "柔和"], description: "卷度轻，适合试探卷发效果。", previewColor: "#7c4f35" },
  { id: "curly-retro", name: "复古羊毛卷", category: "curly", tags: ["复古", "个性"], description: "卷度更明显，适合想看强变化的人。", previewColor: "#4d3328" },
  { id: "curly-air", name: "空气感卷发", category: "curly", tags: ["轻盈", "甜美"], description: "顶部蓬松但整体不夸张。", previewColor: "#9a6a46" },
  { id: "bangs-air", name: "空气刘海", category: "bangs", tags: ["减龄", "轻薄"], description: "适合预览额头遮挡和脸型变化。", previewColor: "#5f4035" },
  { id: "bangs-french", name: "法式刘海", category: "bangs", tags: ["慵懒", "自然"], description: "比齐刘海更松弛，适合日常风格。", previewColor: "#704832" },
  { id: "bangs-blunt", name: "齐刘海", category: "bangs", tags: ["明显", "可爱"], description: "变化明显，适合判断是否适合遮额头。", previewColor: "#2b2521" },
  { id: "mens-crop", name: "男士短碎发", category: "mens", tags: ["清爽", "低维护"], description: "干净短发轮廓，适合日常和职场。", previewColor: "#252321" },
  { id: "mens-side", name: "侧分纹理发", category: "mens", tags: ["商务", "纹理"], description: "保留顶部纹理，侧边更利落。", previewColor: "#3b302b" },
  { id: "mens-curtain", name: "男士中分", category: "mens", tags: ["潮流", "修饰"], description: "适合预览额前长度和脸侧修饰。", previewColor: "#4a342b" },
  { id: "neutral-wolf", name: "中性狼尾", category: "neutral", tags: ["个性", "层次"], description: "强调轮廓和层次，适合中性风尝试。", previewColor: "#3f3a34" },
  { id: "neutral-bowl", name: "圆弧短发", category: "neutral", tags: ["干净", "艺术感"], description: "形状明确，适合看整体气质变化。", previewColor: "#2e2b28" },
  { id: "neutral-shag", name: "蓬松层次发", category: "neutral", tags: ["松弛", "层次"], description: "长度适中，风格轻松。", previewColor: "#6a4738" },
];

export function getHairstylesByCategory(category: HairstyleFilterCategory): Hairstyle[] {
  if (category === "all") {
    return hairstyles;
  }

  return hairstyles.filter((style) => style.category === category);
}
