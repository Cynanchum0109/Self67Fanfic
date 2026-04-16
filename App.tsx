
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import MarkdownRenderer from './components/MarkdownRenderer';
import Game from './components/dino/Game';
import Simulation from './components/RCop/Simulation';
import { Story, AppState } from './types';
import { BookOpen, Quote, Clock, ArrowRight } from 'lucide-react';
import { storiesData } from './src/storiesData';

// 使用 Vite 的 import.meta.glob 直接读取 text 文件夹中的所有 .md 文件（仅用于获取正文内容）
const markdownModules = import.meta.glob('./text/*.md', { query: '?raw', import: 'default', eager: true });

// 从 markdown 文件中提取正文内容（正文即整个文件内容）
function extractBodyContent(content: string): string {
  return content.trim();
}

// 标签格式：逗号分隔，如 lcb67, 连载中
function parseTags(tagsStr: string | undefined): string[] {
  if (!tagsStr || !tagsStr.trim()) return [];
  return tagsStr.split(',').map((t) => t.trim()).filter(Boolean);
}

// 各标签对应的样式（可扩展）
const TAG_STYLES: Record<string, string> = {
  '连载中': 'bg-[#6BD4C0]/25 text-[#0D9488]',
};
const DEFAULT_TAG_STYLE = 'bg-[#E8E0ED] text-[#7B5B89]';

function getTagClassName(tag: string): string {
  return TAG_STYLES[tag] ?? DEFAULT_TAG_STYLE;
}

// 从正文中解析 Chapter N 得到章节目录（用于长篇）
function parseChapters(content: string): { index: number }[] {
  const chapters: { index: number }[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const m = line.match(/^Chapter\s*(\d+)\s*$/i);
    if (m) chapters.push({ index: parseInt(m[1], 10) });
  }
  return chapters.sort((a, b) => a.index - b.index);
}

const App: React.FC = () => {
  // 合并统计数据和正文内容
  const stories = useMemo<Story[]>(() => {
    const mappedStories = storiesData.map(data => {
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
        language: data.language,
        wordCount: data.wordCount,
        order: data.order, // 添加 order 字段
      };
    });
    
    // 不在这里排序，在 renderTOC 中分别对中文和英文排序
    return mappedStories;
  }, [storiesData]); // 依赖 storiesData，当它改变时重新计算

  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<AppState>(AppState.HOME);
  const [showGame, setShowGame] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const [showRTokenTooltip, setShowRTokenTooltip] = useState(false);

  // 初始化：设置第一个故事为活动故事
  useEffect(() => {
    if (stories.length > 0 && !activeStoryId) {
      setActiveStoryId(stories[0].id);
    }
  }, [stories, activeStoryId]);

  const activeStory = stories.find(s => s.id === activeStoryId);

  // 当前长篇的章节目录（有 Chapter N 时才有）
  const readerChapters = useMemo(() => {
    return activeStory ? parseChapters(activeStory.content) : [];
  }, [activeStory?.id, activeStory?.content]);

  const handleJumpToChapter = (index: number) => {
    requestAnimationFrame(() => {
      document.getElementById(`chapter-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

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
      return story.language === 'CN' 
        ? `${story.wordCount} 字符`
        : `${story.wordCount} words`;
    }
    // 后备方案：如果没有预计算值，实时计算
    if (story.language === 'CN') {
      return `${story.content.length} 字符`;
    } else {
      const words = story.content.split(/\s+/).filter(w => w.length > 0);
      return `${words.length} words`;
    }
  };

  // Render Functions
  const renderHome = () => (
    <div className="text-center space-y-10 animate-in zoom-in duration-1000">
      <div className="space-y-3">
        <p className="text-[1.4rem] text-gray-400 font-light italic max-w-md mx-auto leading-[1.8] serif-text tracking-[0.04em]">
          "那呼唤爱的样子如此美丽……"
        </p>
        <div className="mx-auto w-8 h-px bg-gradient-to-r from-transparent via-[#C5EDE6] to-transparent" />
      </div>

      <div className="flex flex-col items-center space-y-5">
        <button
          onClick={() => setCurrentView(AppState.TOC)}
          className="group relative inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-[#9D8AB5] to-[#7B5B89] text-white rounded-full font-semibold overflow-hidden transition-all hover:pr-14 active:scale-95 shadow-xl shadow-[#9D8AB5]/30 hover:shadow-[#7B5B89]/40 text-[0.95rem] tracking-wide"
        >
          <span className="relative z-10">Enter the Garden</span>
          <ArrowRight className="absolute right-4 opacity-0 group-hover:opacity-100 transition-all duration-300" size={18} />
        </button>

        <div className="relative flex justify-center">
          {showRTokenTooltip && (
            <span
              id="r-token-tooltip"
              role="tooltip"
              className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 text-xs text-white bg-[#3D3344] rounded-lg shadow-lg whitespace-nowrap z-50"
            >
              R公司孵化场观测（施工中）
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowSimulation(true)}
            onMouseEnter={() => setShowRTokenTooltip(true)}
            onMouseLeave={() => setShowRTokenTooltip(false)}
            onFocus={() => setShowRTokenTooltip(true)}
            onBlur={() => setShowRTokenTooltip(false)}
            className="group relative block p-0 border-0 bg-transparent cursor-pointer transition-transform hover:scale-110 active:scale-95 focus:outline-none rounded-full"
            aria-label="R公司孵化场观测（施工中）"
          >
            <span className="relative flex items-center justify-center w-10 h-10">
              <img
                src="assets/icons/Rtoken1.png"
                alt=""
                className="w-full h-full object-contain transition-opacity duration-200 group-hover:opacity-0"
              />
              <img
                src="assets/icons/Rtoken2.png"
                alt=""
                className="absolute inset-0 w-full h-full object-contain opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              />
            </span>
          </button>
        </div>

        <button
          onClick={() => setShowGame(true)}
          className="block mx-auto text-[#9DCFC7] hover:text-[#6BD4C0] transition-colors cursor-pointer text-sm font-light"
        >
          碰到就要结婚喔～
        </button>
      </div>
    </div>
  );

  const renderTOC = () => {
    // 分别对中文和英文按 order 降序排序（最新的在前）
    const chineseStories = stories.filter(s => s.language === 'CN').sort((a, b) => (b.order || 0) - (a.order || 0));
    const englishStories = stories.filter(s => s.language === 'EN').sort((a, b) => (b.order || 0) - (a.order || 0));

    return (
      <div className="space-y-14 animate-in fade-in duration-700">
        <header className="pb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#6BD4C0] mb-3">Content</p>
          <h1 className="text-5xl font-bold text-[#7B5B89] tracking-tight">Fanfic</h1>
          <div className="mt-4 w-12 h-0.5 bg-gradient-to-r from-[#6BD4C0] to-[#9D8AB5]" />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          {/* 中文栏 */}
          <div className="space-y-1">
            {chineseStories.length > 0 && (
              <>
                <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-[#9D8AB5] pb-4 border-b border-[#EAE4F0] mb-8">CN</h3>
                <div className="space-y-8">
                  {chineseStories.map((story, index) => (
                    <div
                      key={story.id}
                      onClick={() => { setActiveStoryId(story.id); setCurrentView(AppState.READER); }}
                      className="group cursor-pointer pl-4 border-l-2 border-transparent hover:border-[#6BD4C0] transition-all duration-300 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-[1.2rem] font-bold text-gray-600 group-hover:text-[#3D8C80] transition-colors duration-200 leading-snug">
                          {story.title}
                        </h3>
                        {parseTags(story.tags).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 shrink-0">
                            {parseTags(story.tags).map((tag) => (
                              <span
                                key={tag}
                                className={`text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap ${getTagClassName(tag)}`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-[0.875rem] text-gray-400 leading-[1.7] serif-text line-clamp-2 italic group-hover:text-gray-500 transition-colors">
                        {getStoryPreview(story)}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 英文栏 */}
          <div className="space-y-1">
            {englishStories.length > 0 && (
              <>
                <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-[#6BD4C0] pb-4 border-b border-[#D4F4EC] mb-8">EN</h3>
                <div className="space-y-8">
                  {englishStories.map((story, index) => (
                    <div
                      key={story.id}
                      onClick={() => { setActiveStoryId(story.id); setCurrentView(AppState.READER); }}
                      className="group cursor-pointer pl-4 border-l-2 border-transparent hover:border-[#9D8AB5] transition-all duration-300 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-[1.2rem] font-bold text-gray-600 group-hover:text-[#7B5B89] transition-colors duration-200 leading-snug">
                          {story.title}
                        </h3>
                        {parseTags(story.tags).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 shrink-0">
                            {parseTags(story.tags).map((tag) => (
                              <span
                                key={tag}
                                className={`text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap ${getTagClassName(tag)}`}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-[0.875rem] text-gray-400 leading-[1.7] serif-text line-clamp-2 italic group-hover:text-gray-500 transition-colors">
                        {getStoryPreview(story)}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {stories.length === 0 && (
          <div className="py-32 text-center text-gray-400 border border-dashed border-[#D4F4EC] rounded-2xl bg-[#E8F9F6]/20">
            <p className="text-sm">The garden is currently resting. Please check back later.</p>
          </div>
        )}
      </div>
    );
  };

  const renderReader = () => (
    <div className="flex gap-12 animate-in slide-in-from-right duration-500">
      <div className="flex-1 max-w-3xl">
        {activeStory ? (
          <div className="space-y-10">
            <header className="pb-8 border-b border-[#EAE4F0]">
              {activeStory.fileName === '爱莫若食.md' && (
                <div className="flex justify-center mb-6">
                  <img
                    src="assets/icons/ambrosial.png"
                    alt=""
                    className="w-36 h-36 object-contain opacity-90"
                    style={{ imageRendering: 'auto' }}
                  />
                </div>
              )}
              <div className="flex items-center gap-2 text-[10px] text-[#6BD4C0] font-bold uppercase tracking-[0.3em] mb-5">
                <Quote size={12} /> Reading
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4 mb-3">
                <h1 className="text-3xl md:text-4xl font-bold text-[#7B5B89] min-w-0 break-words tracking-tight leading-tight">{activeStory.title}</h1>
                {parseTags(activeStory.tags).length > 0 && (
                  <div className="flex flex-wrap gap-2 min-w-0 max-w-full md:flex-shrink-0 mt-1">
                    {parseTags(activeStory.tags).map((tag) => (
                      <span
                        key={tag}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap ${getTagClassName(tag)}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {activeStory.summary && (
                <p className="text-[1rem] text-gray-500 italic mb-4 serif-text leading-[1.8] tracking-[0.02em]">{activeStory.summary}</p>
              )}
              {activeStory.version && activeStory.version.toLowerCase() !== 'none' && (() => {
                const relatedStory = findStoryByVersion(activeStory.version, activeStory);
                if (relatedStory) {
                  const versionLabel = relatedStory.language === 'CN' ? '中文版' : 'English Version';
                  return (
                    <button
                      onClick={() => { setActiveStoryId(relatedStory.id); }}
                      className="text-sm text-[#6BD4C0] mb-4 hover:text-[#5FC4B0] hover:underline transition-colors cursor-pointer block"
                    >
                      {versionLabel}: {relatedStory.title}
                    </button>
                  );
                }
                return null;
              })()}
              <div className="flex items-center gap-4 text-gray-300 text-xs tracking-widest">
                <Clock size={12} />
                <span>{getWordCount(activeStory)}</span>
              </div>
            </header>

            <article className="pb-36">
              <MarkdownRenderer content={activeStory.content} />
            </article>
          </div>
        ) : (
          <div className="h-96 flex flex-col items-center justify-center text-gray-400 space-y-4">
            <BookOpen size={48} className="opacity-20" />
            <p className="text-base">Please select a story from the library to begin reading.</p>
            <button onClick={() => setCurrentView(AppState.TOC)} className="text-[#6BD4C0] font-medium hover:text-[#5FC4B0] transition-colors text-sm">Go to Contents →</button>
          </div>
        )}
      </div>

      {/* Reading Sidebar - Chapters List */}
      <aside className="w-56 sticky top-12 h-fit space-y-6 hidden xl:block">
        <div className="space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-300">All Stories</h4>
          <div className="space-y-0.5">
            {stories.filter(s => s.language === 'CN').sort((a, b) => (b.order || 0) - (a.order || 0)).map(s => (
              <button
                key={s.id}
                onClick={() => { setActiveStoryId(s.id); }}
                className={`w-full text-left px-3 py-2 text-[0.8rem] rounded-md truncate transition-all duration-200 ${
                  activeStoryId === s.id
                  ? 'bg-[#EEE8F5] text-[#7B5B89] font-semibold border-l-2 border-[#9D8AB5]'
                  : 'text-gray-400 hover:bg-[#F4F0FA] hover:text-[#7B5B89]'
                }`}
              >
                {s.title}
              </button>
            ))}
            {stories.filter(s => s.language === 'EN').sort((a, b) => (b.order || 0) - (a.order || 0)).map(s => (
              <button
                key={s.id}
                onClick={() => { setActiveStoryId(s.id); }}
                className={`w-full text-left px-3 py-2 text-[0.8rem] rounded-md truncate transition-all duration-200 ${
                  activeStoryId === s.id
                  ? 'bg-[#E3F7F3] text-[#3D8C80] font-semibold border-l-2 border-[#6BD4C0]'
                  : 'text-gray-400 hover:bg-[#F0FAF8] hover:text-[#3D8C80]'
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
    <Layout
      activeView={currentView}
      onNavigate={(view) => setCurrentView(view)}
      chapters={currentView === AppState.READER ? readerChapters : []}
      onJumpToChapter={handleJumpToChapter}
    >
      {currentView === AppState.HOME && renderHome()}
      {currentView === AppState.TOC && renderTOC()}
      {currentView === AppState.READER && renderReader()}
      {showGame && <Game onClose={() => setShowGame(false)} />}
      {showSimulation && <Simulation onClose={() => setShowSimulation(false)} />}
    </Layout>
  );
};

export default App;
