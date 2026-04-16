
import React, { useState } from 'react';

interface MarkdownRendererProps {
  content: string;
}

// 将 **...** 内的内容渲染为点击后才显示正常颜色的“剧透”
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
          ? 'text-gray-700'
          : 'text-gray-300 bg-gray-200/60 cursor-pointer rounded-sm px-0.5 select-none hover:bg-gray-300/70 transition-colors'
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

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const lines = content.split('\n');

  return (
    <div className="serif-text space-y-7 text-[1.1rem] leading-[2] text-gray-700 max-w-[680px] mx-auto tracking-[0.02em]">
      {lines.map((line, idx) => {
        if (line.startsWith('# ')) {
          return <h1 key={idx} className="text-3xl font-bold text-[#7B5B89] pt-12 pb-5 tracking-normal">{line.replace('# ', '')}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={idx} className="text-xl font-bold text-[#5CB8A8] pt-8 pb-3 border-b border-[#D4F4EC] tracking-normal">{line.replace('## ', '')}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={idx} className="text-lg font-semibold text-[#9D8AB5] pt-6 pb-1 tracking-normal">{line.replace('### ', '')}</h3>;
        }
        // 长篇章节标题：Chapter1 / Chapter 1（带 id 供目录跳转）
        const chapterMatch = line.match(/^Chapter\s*(\d+)\s*$/i);
        if (chapterMatch) {
          const num = chapterMatch[1];
          return (
            <h2 key={idx} id={`chapter-${num}`} className="text-xl font-bold text-[#5CB8A8] pt-10 pb-3 border-b border-[#D4F4EC] scroll-mt-24 tracking-normal">
              第{num}章
            </h2>
          );
        }
        if (line.trim() === '---') {
          return (
            <div key={idx} className="my-12 flex items-center gap-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#C5EDE6]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#6BD4C0] opacity-70" />
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#C5EDE6]" />
            </div>
          );
        }
        if (line.trim() === '') {
          return <div key={idx} className="h-2" />;
        }
        return (
          <p key={idx} className="text-[#3D3D4A]">
            {parseSpoilers(line, `line-${idx}`)}
          </p>
        );
      })}
    </div>
  );
};

export default MarkdownRenderer;
