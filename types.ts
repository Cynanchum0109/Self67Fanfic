
export interface Story {
  id: string;
  title: string;
  content: string;
  fileName: string;
  uploadDate: number;
}

export enum AppState {
  HOME = 'home',
  TOC = 'toc',
  READER = 'reader',
  LIBRARY = 'library'
}
