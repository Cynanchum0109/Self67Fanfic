import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 一律用相对路径 base：Vercel / GitHub Pages 都能用。
// 路由走 hash（见 App.tsx），所以不依赖服务端 rewrite。
//
// OFFLINE=true 时切成离线单文件模式：把 JS / CSS / 图片全部内联进一个 index.html，
// 输出到 dist-offline/。浏览器不允许 file:// 加载外部 ES module，
// 所以离线版必须是单文件 + 传统 script（iife），不能直接用线上那份 dist。
const offline = process.env.OFFLINE === 'true';

// 离线包里去掉 Google Fonts 外链：断网时它只会阻塞首屏渲染，
// 字体本来就按 src/index.css 的字体栈回落到系统字体
const stripRemoteFonts = () => ({
  name: 'strip-remote-fonts',
  transformIndexHtml: (html: string) =>
    html.replace(/\s*<link[^>]*fonts\.(?:googleapis|gstatic)\.com[^>]*>/g, '')
});

// singlefile 内联完之后再把 <script type="module"> 降级成传统 script：
// Chrome 在 file:// 下对 module 脚本另有一套限制，产物已经是 iife，不需要 module 语义。
// module 脚本天然 defer，降级后必须同时挪到 </body> 前，否则会在 #root 存在之前执行。
const demoteModuleScript = () => ({
  name: 'demote-module-script',
  closeBundle() {
    const file = path.resolve(__dirname, 'dist-offline', 'index.html');
    if (!fs.existsSync(file)) return;
    const html = fs.readFileSync(file, 'utf-8');
    const open = html.match(/<script\s+type="module"[^>]*>/);
    if (!open) return;
    const start = html.indexOf(open[0]);
    const bodyStart = start + open[0].length;
    const bodyEnd = html.indexOf('</script>', bodyStart);
    if (bodyEnd < 0) return;
    const code = html.slice(bodyStart, bodyEnd);
    const rest = html.slice(0, start) + html.slice(bodyEnd + '</script>'.length);
    fs.writeFileSync(file, rest.replace('</body>', `<script>${code}</script>\n</body>`));
  }
});

export default defineConfig({
  base: './',
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  plugins: [react(), ...(offline ? [stripRemoteFonts(), viteSingleFile(), demoteModuleScript()] : [])],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  },
  build: offline
    ? {
        outDir: 'dist-offline',
        emptyOutDir: true,
        assetsInlineLimit: Number.MAX_SAFE_INTEGER, // 图片也内联成 data URI
        cssCodeSplit: false,
        rollupOptions: {
          output: {
            format: 'iife',
            inlineDynamicImports: true
          }
        }
      }
    : {}
});
