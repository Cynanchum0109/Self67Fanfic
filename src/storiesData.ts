// 此文件由 scripts/generateStoriesData.ts 自动生成基础数据
// 可以手动编辑 order、uploadDate、summary、title 等字段，脚本会保留这些手动编辑的内容

export interface StoryData {
  id: string;
  title: string;
  tags: string;
  summary: string;
  version: string;
  language: string;
  isChinese: boolean;
  fileName: string;
  wordCount: number;
  order: number; // 顺序，越大越新（可以手动修改）
  uploadDate: string; // 更新日期字符串（格式：YYYY-MM-DD 或 YYYY），可以手动修改
}

export const storiesData: StoryData[] = [
  {
    "id": "o0m2j7q6u",
    "title": "破溃点（1）",
    "tags": "lcb67",
    "summary": "他确实喜欢这个，喜欢希斯克利夫的颤抖、他的呜咽，这种剧烈地被爱的残渣磋磨的样子。",
    "version": "none",
    "language": "CN",
    "isChinese": true,
    "fileName": "破溃点.md",
    "wordCount": 5817,
    "uploadDate": "2026-02-14",
    "order": 4
  },
  {
    "id": "t05b10760",
    "title": "老板半夜打电话你接不接",
    "tags": "句点67",
    "summary": "交往前提的半夜骚扰事件",
    "version": "Would you answer a call from your boss in midnight",
    "language": "CN",
    "isChinese": true,
    "fileName": "老板半夜打电话你接不接.md",
    "wordCount": 3363,
    "uploadDate": "2025",
    "order": 3
  },
  {
    "id": "lyg60zucy",
    "title": "总之是想看兔子把驯鹿榨空这种事",
    "tags": "驯鹿/兔子",
    "summary": "鹿打了兔子后被报复事件。",
    "version": "Rabbit riding on Reindeer",
    "language": "CN",
    "isChinese": true,
    "fileName": "总之是想看兔子把驯鹿榨空这种事.md",
    "wordCount": 3390,
    "uploadDate": "2025",
    "order": 2
  },
  {
    "id": "p9axib0f7",
    "title": "求仁得仁",
    "tags": "黑云67",
    "summary": "黑云宝溺水事件",
    "version": "Ask and you shall recieve",
    "language": "CN",
    "isChinese": true,
    "fileName": "求仁得仁.md",
    "wordCount": 5322,
    "uploadDate": "2025",
    "order": 1
  },
  {
    "id": "x2pgmciv2",
    "title": "Would you answer a call from your boss in midnight",
    "tags": "Full-Stop Office 67",
    "summary": "Established relationship.",
    "version": "老板半夜打电话你接不接",
    "language": "EN",
    "isChinese": false,
    "fileName": "Would you answer a call from your boss in midnight.md",
    "wordCount": 1989,
    "uploadDate": "2025",
    "order": 3
  },
  {
    "id": "ft9vaeoig",
    "title": "Rabbit riding on Reindeer",
    "tags": "Reindeer/Rabbit.",
    "summary": "Sex and a little warm",
    "version": "总之是想看兔子把驯鹿榨空这种事",
    "language": "EN",
    "isChinese": false,
    "fileName": "Rabbit riding on Reindeer.md",
    "wordCount": 1899,
    "uploadDate": "2025",
    "order": 2
  },
  {
    "id": "8p1ltjgyg",
    "title": "Ask and you shall recieve",
    "tags": "Kurokumo 67",
    "summary": "Heathcliff drowned Hong Lu in his （i）.",
    "version": "求仁得仁",
    "language": "EN",
    "isChinese": false,
    "fileName": "Ask and you shall recieve.md",
    "wordCount": 2705,
    "uploadDate": "2025",
    "order": 1
  }
];
