
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import MarkdownRenderer from './components/MarkdownRenderer';
import Game from './components/Game';
import Simulation from './components/Simulation';
import { Story, AppState } from './types';
import { BookOpen, Quote, Clock, ArrowRight } from 'lucide-react';
import { storiesData } from './src/storiesData';

// 使用 Vite 的 import.meta.glob 直接读取 text 文件夹中的所有 .md 文件（仅用于获取正文内容）
const markdownModules = import.meta.glob('./text/*.md', { query: '?raw', import: 'default', eager: true });

// 从markdown文件中提取正文内容（跳过前5行）
function extractBodyContent(content: string): string {
  const lines = content.split('\n');
  // 从第6行（index 5）开始是正文
  return lines.slice(5).join('\n').trim();
}

const App: React.FC = () => {
  // 合并统计数据和正文内容
  const stories = useMemo<Story[]>(() => {
    // 调试信息
    console.log('Markdown modules keys:', Object.keys(markdownModules));
    console.log('Stories data:', storiesData.length);
    
    return storiesData.map(data => {
      // 根据文件名找到对应的markdown内容
      const filePath = `./text/${data.fileName}`;
      const content = markdownModules[filePath] as string | undefined;
      
      if (!content) {
        console.warn(`⚠️ 未找到文件内容: ${filePath}`);
        console.warn('可用的文件路径:', Object.keys(markdownModules));
      }
      
      // 提取正文内容
      const bodyContent = content ? extractBodyContent(content) : '';
      
      return {
        id: data.id,
        title: data.title,
        tags: data.tags,
        summary: data.summary,
        version: data.version,
        content: bodyContent,
        fileName: data.fileName,
        uploadDate: Date.now(),
        isChinese: data.isChinese,
        language: data.language,
        wordCount: data.wordCount
      };
    });
  }, []);

  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<AppState>(AppState.HOME);
  const [showGame, setShowGame] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);

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

  // 统计字数（使用预计算的值）
  const getWordCount = (story: Story): string => {
    if (story.wordCount !== undefined) {
      return story.isChinese 
        ? `${story.wordCount} 字符`
        : `${story.wordCount} words`;
    }
    // 后备方案：如果没有预计算值，实时计算
    if (story.isChinese) {
      return `${story.content.length} 字符`;
    } else {
      const words = story.content.split(/\s+/).filter(w => w.length > 0);
      return `${words.length} words`;
    }
  };

  // Render Functions
  const renderHome = () => (
    <div className="text-center space-y-8 animate-in zoom-in duration-1000">
      <p className="text-xl text-gray-400 font-light italic max-w-lg mx-auto">
        "那呼唤爱的样子如此美丽……"
      </p>

      <div className="space-y-4">
        <button 
          onClick={() => setCurrentView(AppState.TOC)}
          className="group relative inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-[#9D8AB5] to-[#7B5B89] text-white rounded-full font-bold overflow-hidden transition-all hover:pr-14 active:scale-95 shadow-2xl shadow-[#9D8AB5]/40 hover:shadow-[#7B5B89]/50"
        >
          <span className="relative z-10">Enter the Garden</span>
          <ArrowRight className="absolute right-4 opacity-0 group-hover:opacity-100 transition-all duration-300" size={20} />
        </button>
        
        <button
          onClick={() => setShowSimulation(true)}
          className="block mx-auto mt-8 text-orange-500 hover:text-orange-600 transition-colors cursor-pointer text-base font-medium underline"
        >
          R公司孵化场观测（施工中）
        </button>
        
        <button
          onClick={() => setShowGame(true)}
          className="block mx-auto mt-12 text-[#6BD4C0] hover:text-[#5FC4B0] transition-colors cursor-pointer text-sm font-light underline"
        >
          碰到就要结婚喔～
        </button>
      </div>
    </div>
  );

  const renderTOC = () => {
    const chineseStories = stories.filter(s => s.isChinese === true);
    const englishStories = stories.filter(s => s.isChinese === false);

    return (
      <div className="space-y-12 animate-in fade-in duration-700">
        <header className="border-b border-[#E8F9F6] pb-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-[#6BD4C0] mb-2">Table of Contents</h2>
          <h1 className="text-5xl font-bold text-[#7B5B89]">Collection of Works</h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* 中文栏 */}
          <div className="space-y-12">
            {chineseStories.length > 0 && (
              <>
                <h3 className="text-2xl font-bold text-[#7B5B89] border-b border-[#D4F4EC] pb-2">CN</h3>
                {chineseStories.map((story, index) => (
                  <div 
                    key={story.id}
                    onClick={() => { setActiveStoryId(story.id); setCurrentView(AppState.READER); }}
                    className="group cursor-pointer flex flex-col gap-6 items-start"
                  >
                    <div className="text-4xl font-black text-[#9D8AB5] opacity-0 group-hover:opacity-100 transition-all duration-500 serif-text">
                      {(index + 1).toString().padStart(2, '0')}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-2xl font-bold text-gray-700 group-hover:text-[#6BD4C0] transition-colors">
                          {story.title}
                        </h3>
                        {story.tags && (
                          <span className="text-xs px-3 py-1 bg-[#E8E0ED] text-[#7B5B89] rounded-full font-medium whitespace-nowrap">
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
                <h3 className="text-2xl font-bold text-[#7B5B89] border-b border-[#8AE7CC] pb-2">EN</h3>
                {englishStories.map((story, index) => (
                  <div 
                    key={story.id}
                    onClick={() => { setActiveStoryId(story.id); setCurrentView(AppState.READER); }}
                    className="group cursor-pointer flex flex-col gap-6 items-start"
                  >
                    <div className="text-4xl font-black text-[#9D8AB5] opacity-0 group-hover:opacity-100 transition-all duration-500 serif-text">
                      {(index + 1).toString().padStart(2, '0')}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-2xl font-bold text-gray-700 group-hover:text-[#6BD4C0] transition-colors">
                          {story.title}
                        </h3>
                        {story.tags && (
                          <span className="text-xs px-3 py-1 bg-[#E8E0ED] text-[#7B5B89] rounded-full font-medium whitespace-nowrap">
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
          <div className="py-32 text-center text-gray-400 border-2 border-dashed border-[#D4F4EC] rounded-3xl bg-[#E8F9F6]/30">
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
            <header className="border-b border-[#E8F9F6] pb-8">
              <div className="flex items-center gap-2 text-xs text-[#6BD4C0] font-bold uppercase tracking-widest mb-4">
                <Quote size={14} /> Chapter Reading
              </div>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h1 className="text-5xl font-bold text-[#7B5B89]">{activeStory.title}</h1>
                {activeStory.tags && (
                  <span className="text-sm px-4 py-2 bg-[#E8E0ED] text-[#7B5B89] rounded-full font-medium whitespace-nowrap">
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
                      className="text-sm text-[#6BD4C0] mb-4 hover:text-[#5FC4B0] hover:underline transition-colors cursor-pointer"
                    >
                      {versionLabel}: {relatedStory.title}
                    </button>
                  );
                }
                return null;
              })()}
              <div className="flex items-center gap-4 text-gray-400 text-sm">
                <span>{getWordCount(activeStory)}</span>
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
            <button onClick={() => setCurrentView(AppState.TOC)} className="text-[#6BD4C0] font-bold underline hover:text-[#5FC4B0] transition-colors">Go to Contents</button>
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
                  ? 'bg-[#7B5B89] text-white font-medium shadow-sm' 
                  : 'text-gray-600 hover:bg-[#E8E0ED] hover:text-[#7B5B89]'
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
      {showGame && <Game onClose={() => setShowGame(false)} />}
      {showSimulation && <Simulation onClose={() => setShowSimulation(false)} />}
    </Layout>
  );
};

export default App;
