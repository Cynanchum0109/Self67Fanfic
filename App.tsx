
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import MarkdownRenderer from './components/MarkdownRenderer';
import Game from './components/dino/Game';
import Simulation from './components/RCop/Simulation';
import UFOGame from './components/ufo/UFOGame';
import { Story, AppState } from './types';
import { BookOpen, Quote, Clock, ArrowRight } from 'lucide-react';
import { storiesData } from './src/storiesData';
import { normalizeNewlines } from './utils/text';

// 使用 Vite 的 import.meta.glob 直接读取 text 文件夹中的所有 .md 文件（仅用于获取正文内容）
const markdownModules = import.meta.glob('./text/*.md', { query: '?raw', import: 'default', eager: true });

// 从 markdown 文件中提取正文内容（正文即整个文件内容）
function extractBodyContent(content: string): string {
  return content.trim();
}

// 标签格式：逗号分隔，如 lcb67, 连载中
function parseTags(tagsStr: string | undefined): string[] {
  if (!tagsStr || !tagsStr.trim()) return [];
  return tagsStr.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
}

// 各标签对应的样式（可扩展）
const TAG_STYLES: Record<string, string> = {
  '连载中': 'border border-[#6FCBB8] text-[#3F9284] bg-transparent',
  '完结': 'border border-gray-300 text-gray-500 bg-transparent',
};
const DEFAULT_TAG_STYLE = 'border border-[#C6B8D8] text-[#8E7BA8] bg-transparent';

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

// —— Hash 路由 ——
// #/ 首页；#/toc 目录；#/story/<id> 阅读；#/game/dino|rcop|ufo 小游戏弹窗
type GameKey = 'dino' | 'rcop' | 'ufo';

interface Route {
  view: AppState;
  storyId: string | null;
  game: GameKey | null;
}

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [seg, arg] = hash.split('/');
  if (seg === 'toc') return { view: AppState.TOC, storyId: null, game: null };
  if (seg === 'story' && arg) return { view: AppState.READER, storyId: decodeURIComponent(arg), game: null };
  if (seg === 'game' && (arg === 'dino' || arg === 'rcop' || arg === 'ufo')) {
    return { view: AppState.HOME, storyId: null, game: arg };
  }
  return { view: AppState.HOME, storyId: null, game: null };
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

  const [route, setRoute] = useState<Route>(parseHash);
  const [showRTokenTooltip, setShowRTokenTooltip] = useState(false);
  // 站点语言（影响小游戏文案），持久化到 localStorage
  const [lang, setLang] = useState<'zh' | 'en'>(() => (localStorage.getItem('site-lang') === 'en' ? 'en' : 'zh'));
  const switchLang = (l: 'zh' | 'en') => {
    setLang(l);
    localStorage.setItem('site-lang', l);
  };
  // 记住最后阅读的文章，供侧栏 Reading 按钮返回
  const lastStoryIdRef = React.useRef<string | null>(null);

  // 监听浏览器前进/回退
  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const currentView = route.view;
  const activeStoryId = route.storyId ?? (currentView === AppState.READER ? lastStoryIdRef.current : null);

  useEffect(() => {
    if (route.storyId) lastStoryIdRef.current = route.storyId;
    // 切换页面/文章时回到顶部
    window.scrollTo(0, 0);
  }, [route.storyId, route.view]);

  // 导航：全部通过修改 hash 完成，回退键即可返回上一页
  const openStory = (id: string) => { window.location.hash = `#/story/${encodeURIComponent(id)}`; };
  const openGame = (game: GameKey) => { window.location.hash = `#/game/${game}`; };
  const closeGame = () => { window.location.hash = '#/'; };
  const navigateView = (view: AppState) => {
    if (view === AppState.TOC) window.location.hash = '#/toc';
    else if (view === AppState.READER) {
      const target = lastStoryIdRef.current ?? stories[0]?.id;
      window.location.hash = target ? `#/story/${encodeURIComponent(target)}` : '#/toc';
    } else window.location.hash = '#/';
  };

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
    return normalizeNewlines(story.summary || "No preview available.");
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
    <div className="relative text-center space-y-12">
      {/* 背景光晕：极淡的紫与薄荷，增加松弛感 */}
      <div className="pointer-events-none absolute -top-40 -left-32 w-96 h-96 rounded-full bg-[#A99BC1]/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-44 -right-28 w-[26rem] h-[26rem] rounded-full bg-[#6FCBB8]/15 blur-3xl" aria-hidden />

      {/* 语言切换：中文薄荷绿 / English 紫（右上角） */}
      <div className="fixed top-4 right-4 md:top-5 md:right-6 z-40 flex items-center gap-2.5 text-sm serif-text select-none">
        <button
          onClick={() => switchLang('zh')}
          className={`transition-all text-[#4FAE9C] ${lang === 'zh' ? 'font-bold underline underline-offset-4 decoration-[#6FCBB8]' : 'opacity-50 hover:opacity-80'}`}
        >
          中文
        </button>
        <span className="text-gray-300">·</span>
        <button
          onClick={() => switchLang('en')}
          className={`transition-all text-[#7A688F] ${lang === 'en' ? 'font-bold underline underline-offset-4 decoration-[#A99BC1]' : 'opacity-50 hover:opacity-80'}`}
        >
          English
        </button>
      </div>

      {/* 站名主视觉 */}
      <header className="relative space-y-4">
        <img
          src="assets/icons/momo67.png"
          alt=""
          className="w-14 h-14 mx-auto object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight serif-text">
          <span className="text-[#6FCBB8]">Hong</span>
          <span className="text-[#7A688F]">Cliff</span>
        </h1>
        <p className="text-[10px] text-[#B3A5C9] uppercase tracking-[0.35em] font-medium">by BQCynanchum</p>
      </header>

      {/* 引文区块 */}
      <div className="relative max-w-md mx-auto">
        <p className="relative text-[1.35rem] text-[#4FAE9C] font-light italic leading-[1.9] serif-text tracking-[0.05em]">
          <span className="text-[#9BD9CC] mr-1" aria-hidden>“</span>
          那呼唤爱的样子如此美丽……
          <span className="text-[#9BD9CC] ml-1" aria-hidden>”</span>
        </p>
        <div className="mt-5 mx-auto w-10 h-px bg-gradient-to-r from-transparent via-[#A99BC1] to-transparent" />
      </div>

      <div className="relative flex flex-col items-center space-y-7">
        <button
          onClick={() => navigateView(AppState.TOC)}
          className="group relative inline-flex items-center gap-3 px-11 py-3.5 bg-[#7A688F] text-[#FAF8F1] rounded-full font-medium serif-text overflow-hidden transition-all hover:pr-14 hover:bg-[#68577F] active:scale-95 shadow-lg shadow-[#7A688F]/25 text-[0.95rem] tracking-[0.15em]"
        >
          <span className="relative z-10">Enter the Garden</span>
          <ArrowRight className="absolute right-4 opacity-0 group-hover:opacity-100 transition-all duration-300" size={18} />
        </button>

        <div className="flex items-center gap-6 justify-center">
          <div className="relative">
            {showRTokenTooltip && (
              <span
                id="r-token-tooltip"
                role="tooltip"
                className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 text-xs text-white bg-[#4A4152] rounded-lg shadow-lg whitespace-nowrap z-50"
              >
                R公司孵化场观测
              </span>
            )}
            <button
              type="button"
              onClick={() => openGame('rcop')}
              onMouseEnter={() => setShowRTokenTooltip(true)}
              onMouseLeave={() => setShowRTokenTooltip(false)}
              onFocus={() => setShowRTokenTooltip(true)}
              onBlur={() => setShowRTokenTooltip(false)}
              className="group relative block p-0 border-0 bg-transparent cursor-pointer transition-transform hover:scale-110 active:scale-95 focus:outline-none rounded-full"
              aria-label="R公司孵化场观测"
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
            onClick={() => openGame('ufo')}
            className="text-2xl transition-transform hover:scale-125 active:scale-95 cursor-pointer select-none"
            aria-label={lang === 'zh' ? 'UFO抓狗游戏' : 'UFO dog-catching game'}
          >
            👽
          </button>

          <button
            onClick={() => openGame('dino')}
            className="text-[#9DCFC7] hover:text-[#6FCBB8] transition-colors cursor-pointer text-sm font-light"
          >
            {lang === 'zh' ? '碰到就要结婚喔～' : 'Touch and you must marry~'}
          </button>
        </div>

        {/* 更新说明降级到底部 */}
        <p className="text-[11px] font-light text-gray-400/80 tracking-wide max-w-lg mx-auto leading-relaxed px-2 pt-2">
          最新更新：6/24/2026，任随你便！S08E4前2章，外星人抓狗小游戏，更新大家赠我的插图
        </p>
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
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#6FCBB8] mb-3">Content</p>
          <h1 className="text-5xl font-bold text-[#7A688F] tracking-tight serif-text">Fanfic</h1>
          <div className="mt-5 w-16 h-px bg-[#C6B8D8]" />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          {/* 中文栏 */}
          <div className="space-y-1">
            {chineseStories.length > 0 && (
              <>
                <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-[#A99BC1] pb-4 border-b border-[#EAE5F0] mb-8">CN</h3>
                <div className="space-y-8">
                  {chineseStories.map((story, index) => (
                    <div
                      key={story.id}
                      onClick={() => openStory(story.id)}
                      className="group cursor-pointer pl-4 border-l-2 border-transparent hover:border-[#6FCBB8] transition-all duration-300 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-[1.2rem] font-bold text-[#4A4152] serif-text group-hover:text-[#3F9284] transition-colors duration-200 leading-snug whitespace-pre-line min-w-0 break-words flex-1">
                          {normalizeNewlines(story.title)}
                        </h3>
                        {parseTags(story.tags).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 justify-end max-w-[45%] min-w-0">
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
                      <p className="text-[0.875rem] text-gray-400 leading-[1.7] serif-text line-clamp-2 italic group-hover:text-gray-500 transition-colors whitespace-pre-line">
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
                <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-[#6FCBB8] pb-4 border-b border-[#D8F1EA] mb-8">EN</h3>
                <div className="space-y-8">
                  {englishStories.map((story, index) => (
                    <div
                      key={story.id}
                      onClick={() => openStory(story.id)}
                      className="group cursor-pointer pl-4 border-l-2 border-transparent hover:border-[#A99BC1] transition-all duration-300 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-[1.2rem] font-bold text-[#4A4152] serif-text group-hover:text-[#8E7BA8] transition-colors duration-200 leading-snug whitespace-pre-line min-w-0 break-words flex-1">
                          {normalizeNewlines(story.title)}
                        </h3>
                        {parseTags(story.tags).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 justify-end max-w-[45%] min-w-0">
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
                      <p className="text-[0.875rem] text-gray-400 leading-[1.7] serif-text line-clamp-2 italic group-hover:text-gray-500 transition-colors whitespace-pre-line">
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
          <div className="py-32 text-center text-gray-400 border border-dashed border-[#D8F1EA] rounded-2xl bg-[#F0FAF7]/20">
            <p className="text-sm">The garden is currently resting. Please check back later.</p>
          </div>
        )}
      </div>
    );
  };

  const renderReader = () => (
    <div className="flex gap-12 animate-in slide-in-from-right duration-500">
      <div className="flex-1 max-w-3xl min-w-0">
        {activeStory ? (
          <div className="space-y-10">
            <header className="pb-8 border-b border-[#EAE5F0]">
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
              <div className="flex items-center gap-2 text-[10px] text-[#6FCBB8] font-bold uppercase tracking-[0.3em] mb-5">
                <Quote size={12} /> Reading
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4 mb-3">
                <h1 className="text-3xl md:text-4xl font-bold text-[#7A688F] serif-text min-w-0 break-words tracking-tight leading-tight whitespace-pre-line">{normalizeNewlines(activeStory.title)}</h1>
                {parseTags(activeStory.tags).length > 0 && (
                  <div className="flex flex-wrap gap-2 w-full min-w-0 md:w-auto md:flex-shrink-0 mt-1">
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
                <p className="text-[1rem] text-gray-500 italic mb-4 serif-text leading-[1.8] tracking-[0.02em] whitespace-pre-line">{normalizeNewlines(activeStory.summary)}</p>
              )}
              {activeStory.version && activeStory.version.toLowerCase() !== 'none' && (() => {
                const relatedStory = findStoryByVersion(activeStory.version, activeStory);
                if (relatedStory) {
                  const versionLabel = relatedStory.language === 'CN' ? '中文版' : 'English Version';
                  return (
                    <button
                      onClick={() => openStory(relatedStory.id)}
                      className="text-sm text-[#6FCBB8] mb-4 hover:text-[#58BCA8] hover:underline transition-colors cursor-pointer block"
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
            <button onClick={() => navigateView(AppState.TOC)} className="text-[#6FCBB8] font-medium hover:text-[#58BCA8] transition-colors text-sm">Go to Contents →</button>
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
                onClick={() => openStory(s.id)}
                className={`w-full text-left px-3 py-2 text-[0.8rem] rounded-md truncate transition-all duration-200 ${
                  activeStoryId === s.id
                  ? 'bg-[#EEEAF4] text-[#7A688F] font-semibold border-l-2 border-[#A99BC1]'
                  : 'text-gray-400 hover:bg-[#F3F0F8] hover:text-[#7A688F]'
                }`}
              >
                {s.title}
              </button>
            ))}
            {stories.filter(s => s.language === 'EN').sort((a, b) => (b.order || 0) - (a.order || 0)).map(s => (
              <button
                key={s.id}
                onClick={() => openStory(s.id)}
                className={`w-full text-left px-3 py-2 text-[0.8rem] rounded-md truncate transition-all duration-200 ${
                  activeStoryId === s.id
                  ? 'bg-[#E7F6F2] text-[#3F9284] font-semibold border-l-2 border-[#6FCBB8]'
                  : 'text-gray-400 hover:bg-[#F1F7F5] hover:text-[#3F9284]'
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
      onNavigate={navigateView}
      chapters={currentView === AppState.READER ? readerChapters : []}
      onJumpToChapter={handleJumpToChapter}
    >
      {currentView === AppState.HOME && renderHome()}
      {currentView === AppState.TOC && renderTOC()}
      {currentView === AppState.READER && renderReader()}
      {route.game === 'dino' && <Game onClose={closeGame} lang={lang} />}
      {route.game === 'rcop' && <Simulation onClose={closeGame} lang={lang} />}
      {route.game === 'ufo' && <UFOGame onClose={closeGame} lang={lang} />}
    </Layout>
  );
};

export default App;
