/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  // 更多环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
  glob: (pattern: string, options?: { as?: 'raw' | 'url', eager?: boolean }) => Record<string, any>
}

