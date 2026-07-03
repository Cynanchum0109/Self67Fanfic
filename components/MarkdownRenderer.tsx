
import React, { useState } from 'react';
import { normalizeNewlines } from '../utils/text';

interface MarkdownRendererProps {
  content: string;
}

// 将 **...** 内的内容渲染为点击后才显示正常颜色的"剧透"
function SpoilerSpan({ children }: { children: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => setRevealed(true)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setRevealed(true); } }}
      className={
        revealed
          ? 'text-gray-700 whitespace-pre-line'
          : 'text-gray-300 bg-gray-200/60 cursor-pointer rounded-sm px-0.5 select-none hover:bg-gray-300/70 transition-colors whitespace-pre-line'
      }
      aria-label={revealed ? undefined : '点击显示'}
    >
      {children}
    </span>
  );
}

// 把一行里的 **...** 拆成 [普通, 剧透, 普通, 剧透, ...]，返回 React 节点数组
function parseSpoilers(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/\*\*(.*?)\*\*/gs);
  if (parts.length === 1) return [text];
  const nodes: React.ReactNode[] = [];
  parts.forEach((part, i) => {
    if (i % 2 === 0) {
      if (part) nodes.push(part);
    } else {
      nodes.push(<React.Fragment key={`${keyPrefix}-${i}`}><SpoilerSpan>{part}</SpoilerSpan></React.Fragment>);
    }
  });
  return nodes;
}

// 识别图片行：整行是一个图片 URL（支持 raw.githubusercontent.com 等），后可跟全角括号脚注 （caption）
// 格式示例：https://raw.githubusercontent.com/.../file.jpg（from 要塞）
const IMAGE_LINE_RE = /^(https?:\/\/[^\s（]+\.(?:jpg|jpeg|png|gif|webp|svg))(?:（([^）]*)）)?\s*$/i;

function parseImageLine(line: string): { url: string; caption: string } | null {
  const m = line.trim().match(IMAGE_LINE_RE);
  if (!m) return null;
  return { url: m[1], caption: m[2] ?? '' };
}

// 插图组件：防止拖拽/右键另存
function StoryImage({ url, caption }: { url: string; caption: string }) {
  const block = (e: React.MouseEvent | React.DragEvent) => e.preventDefault();
  return (
    <figure className="my-8 text-center select-none">
      <div className="relative inline-block max-w-full" onContextMenu={block}>
        <img
          src={url}
          alt={caption || '插图'}
          draggable={false}
          onDragStart={block}
          className="max-w-full rounded-lg shadow-md block mx-auto"
          style={{ WebkitUserDrag: 'none' } as React.CSSProperties}
        />
        {/* 透明覆盖层拦截右键菜单 */}
        <div
          className="absolute inset-0 cursor-default"
          onContextMenu={block}
          aria-hidden
        />
      </div>
      {caption && (
        <figcaption className="mt-2 text-sm text-gray-400 italic tracking-wide whitespace-pre-line">
          {normalizeNewlines(caption)}
        </figcaption>
      )}
    </figure>
  );
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const lines = normalizeNewlines(content).split('\n');

  return (
    <div className="serif-text space-y-7 text-[1.1rem] leading-[2] text-gray-700 max-w-[680px] mx-auto tracking-[0.02em]">
      {lines.map((line, idx) => {
        if (line.startsWith('# ')) {
          return <h1 key={idx} className="text-3xl font-bold text-[#7A688F] pt-12 pb-5 tracking-normal whitespace-pre-line">{line.replace('# ', '')}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={idx} className="text-xl font-bold text-[#58BCA8] pt-8 pb-3 border-b border-[#D8F1EA] tracking-normal whitespace-pre-line">{line.replace('## ', '')}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={idx} className="text-lg font-semibold text-[#A99BC1] pt-6 pb-1 tracking-normal whitespace-pre-line">{line.replace('### ', '')}</h3>;
        }
        // 长篇章节标题：Chapter1 / Chapter 1（带 id 供目录跳转）
        const chapterMatch = line.match(/^Chapter\s*(\d+)\s*$/i);
        if (chapterMatch) {
          const num = chapterMatch[1];
          return (
            <h2 key={idx} id={`chapter-${num}`} className="text-xl font-bold text-[#58BCA8] pt-10 pb-3 border-b border-[#D8F1EA] scroll-mt-24 tracking-normal">
              第{num}章
            </h2>
          );
        }
        if (line.trim() === '---') {
          return (
            <div key={idx} className="my-12 flex items-center gap-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#CBE9E1]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#6FCBB8] opacity-70" />
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#CBE9E1]" />
            </div>
          );
        }
        if (line.trim() === '') {
          return <div key={idx} className="h-2" />;
        }
        // 图片行
        const imgData = parseImageLine(line);
        if (imgData) {
          return <React.Fragment key={idx}><StoryImage url={imgData.url} caption={imgData.caption} /></React.Fragment>;
        }
        return (
          <p key={idx} className="text-[#3D3A45] whitespace-pre-line">
            {parseSpoilers(line, `line-${idx}`)}
          </p>
        );
      })}
    </div>
  );
};

export default MarkdownRenderer;
