// 正文机械错误检查：只查能自动判定的硬伤，不查错别字
// 用法：node scripts/checkText.js   （被 npm run check / prebuild 调用）
import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const textDir = join(projectRoot, 'text');

const errors = [];
const warnings = [];

const files = readdirSync(textDir).filter((f) => f.toLowerCase().endsWith('.md')).sort();

for (const file of files) {
  const raw = readFileSync(join(textDir, file), 'utf-8');
  const lines = raw.split('\n');
  const err = (line, msg) => errors.push(`${file}:${line}  ${msg}`);
  const warn = (line, msg) => warnings.push(`${file}:${line}  ${msg}`);

  // 章节标记：收集 Chapter N，并揪出可能是漏写 Chapter 的裸数字行
  const chapters = [];
  lines.forEach((line, i) => {
    const m = line.match(/^Chapter\s*(\d+)\s*$/i);
    if (m) chapters.push({ num: Number(m[1]), line: i + 1 });
  });

  if (chapters.length > 0) {
    lines.forEach((line, i) => {
      if (/^\s*\d{1,3}\s*$/.test(line)) {
        err(i + 1, `裸数字行 "${line.trim()}"，本篇用 Chapter N 作章节标记，疑似漏写 Chapter`);
      }
    });

    // 章节号必须从 1 开始且连续
    chapters.forEach((c, idx) => {
      if (c.num !== idx + 1) {
        err(c.line, `章节号 Chapter ${c.num} 不连续，按顺序应为 Chapter ${idx + 1}`);
      }
    });
  }

  // 折叠段 **...** 必须成对
  const starCount = (raw.match(/\*\*/g) || []).length;
  if (starCount % 2 !== 0) {
    err(0, `** 标记共 ${starCount} 个，未成对，折叠段无法闭合`);
  }

  // 文件末尾换行（不影响显示，只提醒）
  if (!raw.endsWith('\n')) {
    warn(lines.length, '文件末尾缺少换行');
  }

  // 图片必须是 raw 链接，blob 链接在网页里显示不出来
  lines.forEach((line, i) => {
    if (line.includes('github.com/') && line.includes('/blob/')) {
      err(i + 1, 'GitHub blob 图片链接需转为 raw.githubusercontent.com');
    }
  });

  // 同一行里全角引号和半角引号混用，通常是输入法误触（整篇统一用半角的不算）
  lines.forEach((line, i) => {
    if (/[“”‘’]/.test(line) && /["']/.test(line)) {
      warn(i + 1, `全角/半角引号混用：${line.trim().slice(0, 40)}`);
    }
  });
}

if (warnings.length) {
  console.log(`\n⚠️  ${warnings.length} 条提醒（不阻断构建）：`);
  warnings.forEach((w) => console.log(`   ${w}`));
}

if (errors.length) {
  console.error(`\n❌ ${errors.length} 处需要修正：`);
  errors.forEach((e) => console.error(`   ${e}`));
  console.error('');
  process.exit(1);
}

console.log(`✅ 正文检查通过（${files.length} 篇）`);
