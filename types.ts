
export interface Story {
  id: string;
  title: string;
  tags: string;
  summary: string;
  version: string;
  content: string;
  fileName: string;
  uploadDate: string; // 日期字符串（格式：YYYY-MM-DD 或 YYYY）
  isChinese?: boolean;
  language?: string;
  wordCount?: number;
  order?: number; // 顺序，越大越新
}

export enum AppState {
  HOME = 'home',
  TOC = 'toc',
  READER = 'reader',
  LIBRARY = 'library'
}
