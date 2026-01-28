
export interface Story {
  id: string;
  title: string;
  tags: string;
  summary: string;
  version: string;
  content: string;
  fileName: string;
  uploadDate: number;
  isChinese?: boolean;
  language?: string;
}

export enum AppState {
  HOME = 'home',
  TOC = 'toc',
  READER = 'reader',
  LIBRARY = 'library'
}
