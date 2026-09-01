// 把正文里外链的插图下载到 src/story-img/，并生成 src/storyImages.ts 映射表。
// 这样打包产物自带插图，离线（file://）打开也能看到图；线上也少一次跨域请求。
//
// 用法：node scripts/fetchStoryImages.js
// 已经下载过的文件默认跳过，加 --force 重新下载。

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEXT_DIR = path.join(projectRoot, 'text');
const IMG_DIR = path.join(projectRoot, 'src', 'story-img');
const MAP_FILE = path.join(projectRoot, 'src', 'storyImages.ts');

const force = process.argv.includes('--force');
// 与 MarkdownRenderer 的 IMAGE_LINE_RE 保持一致的后缀集合
const URL_RE = /https?:\/\/[^\s（）"'<>]+\.(?:jpg|jpeg|png|gif|webp|svg)/gi;

function collectUrls() {
  const urls = new Set();
  for (const name of fs.readdirSync(TEXT_DIR)) {
    if (!name.endsWith('.md')) continue;
    const text = fs.readFileSync(path.join(TEXT_DIR, name), 'utf-8');
    for (const m of text.matchAll(URL_RE)) urls.add(m[0]);
  }
  return [...urls].sort();
}

// 原图动辄 8-14MB，直接打包会把产物撑到几十兆。统一压成宽度上限 1600 的 webp。
const MAX_WIDTH = 1600;
const WEBP_QUALITY = 82;

// 文件名：取 URL 末段并做安全化，扩展名统一 .webp；重名时补序号
function localNameFor(url, taken) {
  const raw = decodeURIComponent(url.split('/').pop() || 'image');
  const stem = raw.replace(/\.[a-zA-Z0-9]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_') || 'image';
  // svg / gif 原样保留（矢量、动图走 webp 会失真或掉帧），其余统一转 webp
  const ext = /\.(svg|gif)$/i.test(raw) ? raw.slice(raw.lastIndexOf('.')).toLowerCase() : '.webp';
  let name = `${stem}${ext}`;
  let i = 1;
  while (taken.has(name)) name = `${stem}_${i++}${ext}`;
  taken.add(name);
  return name;
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // svg / gif 原样落盘
  if (/\.(svg|gif)$/i.test(dest)) {
    fs.writeFileSync(dest, buf);
    return;
  }
  await sharp(buf)
    .rotate() // 按 EXIF 摆正
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(dest);
}

async function main() {
  const urls = collectUrls();
  if (urls.length === 0) {
    console.log('正文里没有外链插图，跳过');
    return;
  }
  fs.mkdirSync(IMG_DIR, { recursive: true });

  const taken = new Set();
  const entries = [];
  let downloaded = 0;
  let failed = 0;

  for (const url of urls) {
    const name = localNameFor(url, taken);
    const dest = path.join(IMG_DIR, name);
    if (force || !fs.existsSync(dest)) {
      try {
        await download(url, dest);
        downloaded++;
      } catch (err) {
        // 下载不到就保留外链：线上照常显示，只是离线看不到这张
        console.warn(`⚠️  下载失败，保留外链：${url}（${err.message}）`);
        taken.delete(name);
        failed++;
        continue;
      }
    }
    entries.push({ url, name });
  }

  const imports = entries.map((e, i) => `import img${i} from './story-img/${e.name}';`).join('\n');
  const pairs = entries.map((e, i) => `  ${JSON.stringify(e.url)}: img${i},`).join('\n');
  const out = `// 此文件由 scripts/fetchStoryImages.js 自动生成，请勿手动编辑
// 正文里的外链插图 → 打包进产物的本地副本
${imports}

export const STORY_IMAGES: Record<string, string> = {
${pairs}
};
`;
  fs.writeFileSync(MAP_FILE, out, 'utf-8');
  console.log(`✅ 插图 ${entries.length} 张（新下载 ${downloaded}，失败 ${failed}）→ src/storyImages.ts`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
