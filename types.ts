
export interface Story {
  id: string;
  title: string;
  tags: string;
  summary: string;
  version: string;
  content: string;
  fileName: string;
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
