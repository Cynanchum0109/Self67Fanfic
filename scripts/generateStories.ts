import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Story {
  id: string;
  title: string;
  tags: string;
  summary: string;
  version: string;
  content: string;
  fileName: string;
  uploadDate: number;
}

function parseMarkdownFile(filePath: string, fileName: string): Story {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // 解析格式：第一行标签，第二行简介，第三行版本，之后是正文
  const tags = lines[0]?.trim() || '';
  const summary = lines[1]?.trim() || '';
  const version = lines[2]?.trim() || '';
  
  // 从第4行（index 3）开始查找第一个非空行作为正文开始
  let contentStartIndex = 3;
  for (let i = 3; i < lines.length; i++) {
    if (lines[i].trim() !== '') {
      contentStartIndex = i;
      break;
    }
  }
  
  // 提取正文内容
  const bodyContent = lines.slice(contentStartIndex).join('\n').trim();
  
  // 使用标签作为标题，如果没有标签则使用文件名
  const title = tags || fileName.replace('.md', '');
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    title,
    tags,
    summary,
    version,
    content: bodyContent,
    fileName,
    uploadDate: Date.now()
  };
}

function generateStories() {
  const textDir = path.join(__dirname, '../text');
  const outputFile = path.join(__dirname, '../src/stories.ts');
  
  // 确保输出目录存在
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 读取 text 文件夹中的所有 .md 文件
  const files = fs.readdirSync(textDir).filter(file => file.endsWith('.md'));
  
  const stories: Story[] = files.map(file => {
    const filePath = path.join(textDir, file);
    return parseMarkdownFile(filePath, file);
  });
  
  // 生成 TypeScript 文件
  const content = `// 此文件由 scripts/generateStories.ts 自动生成
// 请勿手动编辑此文件

import { Story } from '../types';

export const stories: Story[] = ${JSON.stringify(stories, null, 2)};
`;
  
  fs.writeFileSync(outputFile, content, 'utf-8');
  console.log(`✅ 成功生成 ${stories.length} 个故事到 ${outputFile}`);
}

generateStories();

