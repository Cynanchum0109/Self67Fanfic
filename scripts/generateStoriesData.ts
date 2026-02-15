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
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // 解析格式：
  // 第一行：标签
  // 第二行：简介
  // 第三行：版本信息（对应文件名或none，可能带前缀如"Chinese:"或"English:"）
  // 第四行：语言标识（CN或EN）
  // 第五行：空行
  // 第六行开始：正文
  
  // 找到第一个非空行作为正文开始（跳过前4行元数据和可能的空行）
  let bodyStartIndex = 4;
  for (let i = 4; i < lines.length; i++) {
    if (lines[i].trim() !== '') {
      bodyStartIndex = i;
      break;
    }
  }
  
  const tags = lines[0]?.trim() || '';
  const summary = lines[1]?.trim() || '';
  let version = lines[2]?.trim() || '';
  let language = lines[3]?.trim().toUpperCase() || '';
  
  console.log(`\n解析文件: ${fileName}`);
  console.log(`  第1行(标签): "${tags}"`);
  console.log(`  第2行(简介): "${summary}"`);
  console.log(`  第3行(版本): "${version}"`);
  console.log(`  第4行(语言): "${language}"`);
  
  // 处理版本信息：可能包含 "Chinese:" 或 "English:" 前缀
  if (version.toLowerCase().startsWith('chinese:')) {
    version = version.substring(8).trim();
  } else if (version.toLowerCase().startsWith('english:')) {
    version = version.substring(8).trim();
  }
  
  // 检查第四行是否是语言标识（CN或EN）
  if (language === 'CN' || language === 'EN') {
    // 标准格式：第三行是版本，第四行是语言
    bodyStartIndex = 5; // 前4行元数据 + 第5行空行，第6行开始正文
    console.log(`  ✅ 标准格式: 版本="${version}", 语言="${language}"`);
  } else {
    // 如果第四行不是语言标识，检查第三行是否是语言标识
    if (lines[2]?.trim().toUpperCase() === 'CN' || lines[2]?.trim().toUpperCase() === 'EN') {
      language = lines[2].trim().toUpperCase();
      version = ''; // 如果第三行是语言，版本信息可能在第二行
      bodyStartIndex = 4; // 语言标识 + 空行 + 正文
      console.log(`  ⚠️  非标准格式: 第三行是语言，版本为空`);
    } else {
      // 根据文件名判断语言
      const hasChinese = /[\u4e00-\u9fa5]/.test(fileName);
      language = hasChinese ? 'CN' : 'EN';
      bodyStartIndex = 5; // 默认从第6行开始
      console.log(`  ⚠️  未找到语言标识，根据文件名判断: ${language}`);
    }
  }
  
  console.log(`  最终: 版本="${version}", 语言="${language}", 正文从第${bodyStartIndex + 1}行开始`);
  
  // 从bodyStartIndex开始是正文
  const bodyContent = lines.slice(bodyStartIndex).join('\n').trim();
  
  // 使用文件名作为标题（去掉路径和扩展名）
  const title = fileName.replace('.md', '');
  
  // 根据语言标识判断（CN=中文，EN=英文）
  const isChinese = language === 'CN';
  
  // 统计字数（中文统计字符，英文统计单词）
  const wordCount = isChinese 
    ? bodyContent.length 
    : bodyContent.split(/\s+/).filter(w => w.length > 0).length;
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    title,
    tags,
    summary,
    version,
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
            title: story.title,
            summary: story.summary,
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
      if (existing.title !== undefined) story.title = existing.title;
      if (existing.summary !== undefined) story.summary = existing.summary;
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

