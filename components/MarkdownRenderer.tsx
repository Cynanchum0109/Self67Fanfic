
import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // A simple markdown processor for basic formatting (bold, italic, headers)
  // In a real app we would use react-markdown, but here we'll do clean rendering for the demo
  const lines = content.split('\n');
  
  return (
    <div className="serif-text space-y-6 text-lg leading-relaxed text-gray-700 max-w-2xl mx-auto">
      {lines.map((line, idx) => {
        if (line.startsWith('# ')) {
          return <h1 key={idx} className="text-4xl font-bold text-[#7B5B89] pt-8 pb-4">{line.replace('# ', '')}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={idx} className="text-2xl font-bold text-[#6BD4C0] pt-6 pb-2 border-b border-[#E8F9F6]">{line.replace('## ', '')}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={idx} className="text-xl font-semibold text-[#9D8AB5] pt-4">{line.replace('### ', '')}</h3>;
        }
        if (line.trim() === '---') {
          return <hr key={idx} className="my-10 border-[#D4F4EC]" />;
        }
        if (line.trim() === '') {
          return <div key={idx} className="h-4" />;
        }
        return <p key={idx} className="text-gray-700">{line}</p>;
      })}
    </div>
  );
};

export default MarkdownRenderer;
