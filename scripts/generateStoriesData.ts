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
}

function parseMarkdownFile(filePath: string, fileName: string): StoryData {
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
    return parseMarkdownFile(filePath, file);
  });
  
  // 生成 TypeScript 文件
  const content = `// 此文件由 scripts/generateStoriesData.ts 自动生成
// 请勿手动编辑此文件

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
}

export const storiesData: StoryData[] = ${JSON.stringify(storiesData, null, 2)};
`;
  
  fs.writeFileSync(outputFile, content, 'utf-8');
  console.log(`✅ 成功生成 ${storiesData.length} 个故事数据到 ${outputFile}`);
  console.log('📊 统计信息:');
  storiesData.forEach(s => {
    console.log(`  - ${s.title} (${s.language}): ${s.wordCount} ${s.isChinese ? '字符' : 'words'}`);
  });
}

generateStoriesData();

