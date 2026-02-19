import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface StoryData {
  id: string;
  title: string;
  tags: string;
  summary: string;
  version: string;
  language: string;
  isChinese: boolean;
  fileName: string;
  wordCount: number;
  order: number;
  uploadDate: string; // 日期字符串（格式：YYYY-MM-DD 或 YYYY）
}

function parseMarkdownFile(filePath: string, fileName: string): Omit<StoryData, 'order' | 'uploadDate'> {
  const content = fs.readFileSync(filePath, 'utf-8').trim();

  // 现在不再从 Markdown 前几行解析元数据，
  // 整个文件内容都视为正文，元数据在 storiesData.ts 中维护

  // 根据文件名是否包含中文字符粗略判断语言
  const hasChinese = /[\u4e00-\u9fa5]/.test(fileName);
  const language = hasChinese ? 'CN' : 'EN';
  const isChinese = hasChinese;

  // 使用文件名作为默认标题（去掉扩展名），之后可以在 storiesData.ts 中手动修改
  const title = fileName.replace('.md', '');

  // 统计字数（中文统计字符，英文统计单词）
  const wordCount = isChinese
    ? content.length
    : content.split(/\s+/).filter(w => w.length > 0).length;

  return {
    id: Math.random().toString(36).substr(2, 9),
    title,
    tags: '',
    summary: '',
    version: 'none',
    language,
    isChinese,
    fileName,
    wordCount
  };
}

// 手动指定每个文件的更新日期（格式：YYYY-MM-DD 或 YYYY）
function getUploadDate(fileName: string): string {
  // 破溃点使用具体日期，其他都使用 "2025"
  if (fileName === '破溃点.md') {
    return '2026-02-14';
  }
  
  return '2025';
}

function generateStoriesData() {
  const textDir = path.join(__dirname, '../text');
  const outputFile = path.join(__dirname, '../src/storiesData.ts');
  
  // 确保输出目录存在
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 读取 text 文件夹中的所有 .md 文件
  const files = fs.readdirSync(textDir).filter(file => file.endsWith('.md'));
  
  const storiesData: StoryData[] = files.map(file => {
    const filePath = path.join(textDir, file);
    const parsed = parseMarkdownFile(filePath, file);
    const uploadDate = getUploadDate(file);
    return {
      ...parsed,
      uploadDate,
      order: 0, // 临时值，稍后会重新分配
    };
  });
  
  // 尝试读取现有文件，保留手动编辑的字段（order, uploadDate, summary, title 等）
  let existingData: Map<string, Partial<StoryData>> = new Map();
  try {
    const existingContent = fs.readFileSync(outputFile, 'utf-8');
    // 提取 storiesData 数组部分
    const arrayMatch = existingContent.match(/export const storiesData: StoryData\[\] = (\[[\s\S]*?\]);/);
    if (arrayMatch) {
      try {
        // 移除单行注释（// 开头的注释）
        let jsonContent = arrayMatch[1].replace(/\/\/.*$/gm, '');
        // 解析 JSON 数组
        const existingStories: StoryData[] = JSON.parse(jsonContent);
        existingStories.forEach(story => {
          existingData.set(story.fileName, {
            tags: story.tags,
            title: story.title,
            summary: story.summary,
            version: story.version,
            order: story.order,
            uploadDate: story.uploadDate,
          });
        });
        console.log(`✅ 成功读取 ${existingData.size} 个现有故事的手动编辑内容`);
      } catch (e) {
        console.warn('⚠️ 无法解析现有文件，将使用默认值:', e);
      }
    }
  } catch (e) {
    // 文件不存在或无法读取，使用默认值
  }
  
  // 如果存在手动编辑的数据，使用它们；否则按语言分别自动分配 order
  const chineseStories: StoryData[] = [];
  const englishStories: StoryData[] = [];
  
  storiesData.forEach(story => {
    const existing = existingData.get(story.fileName);
    if (existing) {
      // 保留手动编辑的数据（如果存在）
      if (existing.tags !== undefined) story.tags = existing.tags;
      if (existing.title !== undefined) story.title = existing.title;
      if (existing.summary !== undefined) story.summary = existing.summary;
      if (existing.version !== undefined) story.version = existing.version;
      if (existing.order !== undefined) story.order = existing.order;
      if (existing.uploadDate !== undefined) story.uploadDate = existing.uploadDate;
    } else {
      // 自动分配：根据语言分别管理
      if (story.isChinese) {
        chineseStories.push(story);
      } else {
        englishStories.push(story);
      }
    }
  });
  
  // 分别按 uploadDate 排序并分配 order（中文和英文分开）
  chineseStories.sort((a, b) => a.uploadDate.localeCompare(b.uploadDate));
  chineseStories.forEach((story, index) => {
    story.order = index + 1;
  });
  
  englishStories.sort((a, b) => a.uploadDate.localeCompare(b.uploadDate));
  englishStories.forEach((story, index) => {
    story.order = index + 1;
  });
  
  // 合并所有数据（手动编辑的 + 自动分配的）
  const allStories = [...storiesData.filter(s => existingData.has(s.fileName)), ...chineseStories, ...englishStories];
  
  // 按语言和 order 排序（用于生成文件，但实际显示时会分开）
  allStories.sort((a, b) => {
    if (a.isChinese !== b.isChinese) {
      return a.isChinese ? -1 : 1; // 中文在前
    }
    return b.order - a.order; // 同语言内按 order 降序
  });
  
  // 生成 TypeScript 文件
  const content = `// 此文件由 scripts/generateStoriesData.ts 自动生成基础数据
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

export const storiesData: StoryData[] = ${JSON.stringify(allStories, null, 2)};
`;
  
  fs.writeFileSync(outputFile, content, 'utf-8');
  console.log(`✅ 成功生成 ${allStories.length} 个故事数据到 ${outputFile}`);
  console.log('📊 统计信息（中文和英文分开管理顺序）:');
  console.log('  中文:');
  allStories.filter(s => s.isChinese).sort((a, b) => b.order - a.order).forEach(s => {
    console.log(`    - [Order ${s.order}] ${s.title}: ${s.wordCount} 字符, 更新日期: ${s.uploadDate}`);
  });
  console.log('  英文:');
  allStories.filter(s => !s.isChinese).sort((a, b) => b.order - a.order).forEach(s => {
    console.log(`    - [Order ${s.order}] ${s.title}: ${s.wordCount} words, 更新日期: ${s.uploadDate}`);
  });
}

generateStoriesData();

