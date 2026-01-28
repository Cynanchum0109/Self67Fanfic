
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import MarkdownRenderer from './components/MarkdownRenderer';
import { Story, AppState } from './types';
import { BookOpen, Quote, Clock, ArrowRight } from 'lucide-react';

// 使用 Vite 的 import.meta.glob 直接读取 text 文件夹中的所有 .md 文件
const markdownModules = import.meta.glob('./text/*.md', { query: '?raw', import: 'default', eager: true });

// 解析 Markdown 文件内容
function parseMarkdownContent(content: string, fileName: string): Story {
  const lines = content.split('\n');
  
  // 解析格式：
  // 第一行：标签
  // 第二行：简介
  // 第三行：版本信息（对应文件名或none）
  // 第四行：语言标识（CN或EN）
  // 第五行：空行
  // 第六行开始：正文
  const tags = lines[0]?.trim() || '';
  const summary = lines[1]?.trim() || '';
  const version = lines[2]?.trim() || '';
  const language = (lines[3]?.trim() || '').toUpperCase();
  
  // 从第6行（index 5）开始是正文
  const bodyContent = lines.slice(5).join('\n').trim();
  
  // 使用文件名作为标题（去掉路径和扩展名）
  const title = fileName.replace('.md', '').replace('./text/', '').replace('/text/', '');
  
  // 根据语言标识判断（CN=中文，EN=英文）
  const isChinese = language === 'CN';
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    title,
    tags,
    summary,
    version,
    content: bodyContent,
    fileName: fileName.replace('./text/', '').replace('/text/', ''),
    uploadDate: Date.now(),
    isChinese,
    language
  };
}

const App: React.FC = () => {
  // 从导入的文件中解析所有故事
  const stories = useMemo<Story[]>(() => {
    return Object.entries(markdownModules).map(([path, content]) => {
      return parseMarkdownContent(content as string, path);
    });
  }, []);

  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<AppState>(AppState.HOME);

  // 初始化：设置第一个故事为活动故事
  useEffect(() => {
    if (stories.length > 0 && !activeStoryId) {
      setActiveStoryId(stories[0].id);
    }
  }, [stories, activeStoryId]);

  const activeStory = stories.find(s => s.id === activeStoryId);

  const getStoryPreview = (story: Story) => {
    // 只显示简介，不显示版本信息
    return story.summary || "No preview available.";
  };

  // 根据版本信息找到对应的文章
  // 版本信息直接是对应的文件名（去掉扩展名），如果是none则没有对应版本
  const findStoryByVersion = (version: string, currentStory: Story): Story | undefined => {
    // 如果版本是none，没有对应版本
    if (version.toLowerCase() === 'none') return undefined;
    
    // 版本信息就是对应的文件名（去掉扩展名）
    const versionName = version.trim();
    
    // 查找匹配的文章（通过文件名或标题）
    return stories.find(s => {
      // 排除当前文章本身
      if (s.id === currentStory.id) return false;
      
      // 匹配文件名（去掉扩展名）或标题
      const sFileName = s.fileName.replace('.md', '').trim();
      const sTitle = s.title.trim();
      const normalizedVersion = versionName.trim();
      
      // 直接匹配文件名或标题（精确匹配或包含匹配）
      return sFileName === normalizedVersion || 
             sTitle === normalizedVersion ||
             sFileName.includes(normalizedVersion) ||
             sTitle.includes(normalizedVersion) ||
             normalizedVersion.includes(sFileName) ||
             normalizedVersion.includes(sTitle);
    });
  };

  // 统计字数（中文统计字符，英文统计单词）
  const getWordCount = (content: string, isChinese?: boolean): string => {
    if (isChinese) {
      return `${content.length} 字符`;
    } else {
      const words = content.split(/\s+/).filter(w => w.length > 0);
      return `${words.length} words`;
    }
  };

  // Render Functions
  const renderHome = () => (
    <div className="text-center space-y-8 animate-in zoom-in duration-1000">
      <div className="space-y-4">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <BookOpen className="text-emerald-400" size={40} />
        </div>
        <h1 className="text-7xl font-bold tracking-tighter text-emerald-950">
          Muse<span className="text-purple-400">Garden</span>
        </h1>
        <p className="text-xl text-gray-400 font-light italic max-w-lg mx-auto">
          "Where stories bloom and thoughts find their silence."
        </p>
      </div>
      
      <button 
        onClick={() => setCurrentView(AppState.TOC)}
        className="group relative inline-flex items-center gap-3 px-10 py-4 bg-emerald-900 text-white rounded-full font-bold overflow-hidden transition-all hover:pr-14 active:scale-95 shadow-2xl shadow-emerald-100"
      >
        <span className="relative z-10">Enter the Garden</span>
        <ArrowRight className="absolute right-4 opacity-0 group-hover:opacity-100 transition-all duration-300" size={20} />
      </button>
    </div>
  );

  const renderTOC = () => {
    const chineseStories = stories.filter(s => s.isChinese === true);
    const englishStories = stories.filter(s => s.isChinese === false);

    return (
      <div className="space-y-12 animate-in fade-in duration-700">
        <header className="border-b border-gray-50 pb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-500 mb-2">Table of Contents</h2>
          <h1 className="text-5xl font-bold text-emerald-950">Collection of Works</h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* 中文栏 */}
          <div className="space-y-12">
            {chineseStories.length > 0 && (
              <>
                <h3 className="text-2xl font-bold text-emerald-800 border-b border-emerald-100 pb-2">中文</h3>
                {chineseStories.map((story, index) => (
                  <div 
                    key={story.id}
                    onClick={() => { setActiveStoryId(story.id); setCurrentView(AppState.READER); }}
                    className="group cursor-pointer flex flex-col gap-6 items-start"
                  >
                    <div className="text-4xl font-black text-emerald-50 opacity-0 group-hover:opacity-100 transition-all duration-500 serif-text">
                      {(index + 1).toString().padStart(2, '0')}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-2xl font-bold text-gray-800 group-hover:text-purple-600 transition-colors">
                          {story.title}
                        </h3>
                        {story.tags && (
                          <span className="text-xs px-3 py-1 bg-purple-50 text-purple-600 rounded-full font-medium whitespace-nowrap">
                            {story.tags}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 leading-relaxed serif-text line-clamp-2 italic">
                        {getStoryPreview(story)}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* 英文栏 */}
          <div className="space-y-12">
            {englishStories.length > 0 && (
              <>
                <h3 className="text-2xl font-bold text-emerald-800 border-b border-emerald-100 pb-2">English</h3>
                {englishStories.map((story, index) => (
                  <div 
                    key={story.id}
                    onClick={() => { setActiveStoryId(story.id); setCurrentView(AppState.READER); }}
                    className="group cursor-pointer flex flex-col gap-6 items-start"
                  >
                    <div className="text-4xl font-black text-emerald-50 opacity-0 group-hover:opacity-100 transition-all duration-500 serif-text">
                      {(index + 1).toString().padStart(2, '0')}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-2xl font-bold text-gray-800 group-hover:text-purple-600 transition-colors">
                          {story.title}
                        </h3>
                        {story.tags && (
                          <span className="text-xs px-3 py-1 bg-purple-50 text-purple-600 rounded-full font-medium whitespace-nowrap">
                            {story.tags}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 leading-relaxed serif-text line-clamp-2 italic">
                        {getStoryPreview(story)}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {stories.length === 0 && (
          <div className="py-32 text-center text-gray-400 border-2 border-dashed border-emerald-50 rounded-3xl">
            <p>The garden is currently resting. Please check back later.</p>
          </div>
        )}
      </div>
    );
  };

  const renderReader = () => (
    <div className="flex gap-12 animate-in slide-in-from-right duration-500">
      <div className="flex-1 max-w-3xl">
        {activeStory ? (
          <div className="space-y-12">
            <header className="border-b border-gray-50 pb-8">
              <div className="flex items-center gap-2 text-xs text-emerald-500 font-bold uppercase tracking-widest mb-4">
                <Quote size={14} /> Chapter Reading
              </div>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h1 className="text-5xl font-bold text-emerald-950">{activeStory.title}</h1>
                {activeStory.tags && (
                  <span className="text-sm px-4 py-2 bg-purple-50 text-purple-600 rounded-full font-medium whitespace-nowrap">
                    {activeStory.tags}
                  </span>
                )}
              </div>
              {activeStory.summary && (
                <p className="text-lg text-gray-600 italic mb-4 serif-text">{activeStory.summary}</p>
              )}
              {activeStory.version && activeStory.version.toLowerCase() !== 'none' && (() => {
                const relatedStory = findStoryByVersion(activeStory.version, activeStory);
                if (relatedStory) {
                  // 显示对应的语言版本标签
                  const versionLabel = relatedStory.isChinese ? '中文版' : 'English Version';
                  return (
                    <button
                      onClick={() => { setActiveStoryId(relatedStory.id); }}
                      className="text-sm text-purple-500 mb-4 hover:text-purple-600 hover:underline transition-colors cursor-pointer"
                    >
                      {versionLabel}: {relatedStory.title}
                    </button>
                  );
                }
                return null;
              })()}
              <div className="flex items-center gap-4 text-gray-400 text-sm">
                <span>{getWordCount(activeStory.content, activeStory.isChinese)}</span>
              </div>
            </header>

            <article className="pb-32">
              <MarkdownRenderer content={activeStory.content} />
            </article>
          </div>
        ) : (
          <div className="h-96 flex flex-col items-center justify-center text-gray-400 space-y-4">
            <BookOpen size={64} className="opacity-20" />
            <p className="text-lg">Please select a story from the library to begin reading.</p>
            <button onClick={() => setCurrentView(AppState.TOC)} className="text-emerald-500 font-bold underline">Go to Contents</button>
          </div>
        )}
      </div>

      {/* Reading Sidebar - Chapters List */}
      <aside className="w-64 sticky top-12 h-fit space-y-8 hidden xl:block">
        {/* Local TOC */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Chapters</h4>
          <div className="space-y-1">
            {stories.map(s => (
              <button
                key={s.id}
                onClick={() => { setActiveStoryId(s.id); }}
                className={`w-full text-left px-4 py-2 text-sm rounded-lg truncate transition-all ${
                  activeStoryId === s.id 
                  ? 'bg-emerald-500 text-white font-medium' 
                  : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );

  return (
    <Layout activeView={currentView} onNavigate={(view) => setCurrentView(view)}>
      {currentView === AppState.HOME && renderHome()}
      {currentView === AppState.TOC && renderTOC()}
      {currentView === AppState.READER && renderReader()}
    </Layout>
  );
};

export default App;
