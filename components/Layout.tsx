
import React, { useState } from 'react';
import { BookOpen, List, Home, X } from 'lucide-react';
import { AppState } from '../types';

// 使用相对路径，适配本地、Vercel 和 GitHub Pages（项目根为 /Self67Fanfic/）
const MOMO67_ICON_URL = 'assets/icons/momo67.png';

interface LayoutProps {
  children: React.ReactNode;
  activeView: AppState;
  onNavigate: (view: AppState) => void;
  /** 当前长篇的章节目录（仅 READER 且有 Chapter N 时传入） */
  chapters?: { index: number }[];
  /** 点击章节时滚动到对应位置并关闭侧栏 */
  onJumpToChapter?: (index: number) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onNavigate, chapters = [], onJumpToChapter }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // We keep the library view hidden for the general user, but accessible if they know where to look (or for the author)
  const isReaderOrToc = activeView === AppState.READER || activeView === AppState.TOC;

  const handleNavigate = (view: AppState) => {
    onNavigate(view);
    setIsSidebarOpen(false); // 导航后关闭侧边栏
  };

  return (
    <div className="flex min-h-screen bg-[#F8F6FA]">
      {/* Hamburger Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-50 flex items-center justify-center p-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-[#EAE4F0] hover:bg-[#F0EDF5] transition-colors aspect-square w-10 h-10"
        aria-label="Toggle menu"
      >
        {isSidebarOpen ? (
          <X size={24} className="text-[#7B5B89] shrink-0" />
        ) : (
          <span className="aspect-square w-7 h-7 flex items-center justify-center overflow-hidden">
            <img 
              src={MOMO67_ICON_URL}
              alt="Menu" 
              className="w-full h-full object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
          </span>
        )}
      </button>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Fixed Sidebar */}
      <aside className={`w-64 fixed inset-y-0 left-0 bg-gradient-to-b from-[#FDFBFF] to-white border-r border-[#EAE4F0] shadow-sm flex flex-col z-40 transition-transform duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-8 pb-6">
          <h1
            onClick={() => handleNavigate(AppState.HOME)}
            className="text-2xl font-bold tracking-tighter flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#6BD4C0] group-hover:bg-[#5FC4B0] transition-colors animate-pulse"></div>
              <span><span className="text-[#6BD4C0]">Hong</span><span className="text-[#7B5B89]">Cliff</span></span>
            </div>
            <span className="aspect-square w-8 h-8 flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={MOMO67_ICON_URL}
                alt="Logo"
                className="w-full h-full object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
            </span>
          </h1>
          <p className="text-[10px] text-[#B8A8CC] mt-1.5 uppercase tracking-[0.2em] font-medium">by BQCynanchum</p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <button
            onClick={() => handleNavigate(AppState.HOME)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm ${
              activeView === AppState.HOME
              ? 'bg-[#E3F7F3] text-[#3D8C80] font-semibold shadow-[inset_3px_0_0_#6BD4C0]'
              : 'text-gray-500 hover:bg-[#F4F0FA] hover:text-[#7B5B89]'
            }`}
          >
            <Home size={16} className="shrink-0" />
            <span>Home</span>
          </button>

          <button
            onClick={() => handleNavigate(AppState.TOC)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm ${
              activeView === AppState.TOC
              ? 'bg-[#EEE8F5] text-[#7B5B89] font-semibold shadow-[inset_3px_0_0_#9D8AB5]'
              : 'text-gray-500 hover:bg-[#F4F0FA] hover:text-[#7B5B89]'
            }`}
          >
            <List size={16} className="shrink-0" />
            <span>Contents</span>
          </button>

          {isReaderOrToc && (
            <button
              onClick={() => handleNavigate(AppState.READER)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                activeView === AppState.READER
              ? 'bg-[#E3F7F3] text-[#3D8C80] font-semibold shadow-[inset_3px_0_0_#6BD4C0]'
              : 'text-gray-500 hover:bg-[#F4F0FA] hover:text-[#7B5B89]'
              }`}
            >
              <BookOpen size={16} className="shrink-0" />
              <span>Reading</span>
            </button>
          )}

          {activeView === AppState.READER && chapters.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#EAE4F0]">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-300 px-4 mb-2">章节目录</h4>
              <div className="space-y-0.5 max-h-64 overflow-y-auto">
                {chapters.map((ch) => (
                  <button
                    key={ch.index}
                    onClick={() => {
                      onJumpToChapter?.(ch.index);
                      setIsSidebarOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm rounded-lg text-gray-400 hover:bg-[#F4F0FA] hover:text-[#7B5B89] transition-colors"
                  >
                    第{ch.index}章
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="p-6 border-t border-[#EAE4F0]">
          <p className="text-[10px] text-center text-gray-300 tracking-widest">© 2026 BQCynanchum</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1">
        <div className={`max-w-5xl mx-auto p-8 md:p-14 lg:p-20 ${activeView === AppState.HOME ? 'flex items-center justify-center min-h-screen' : 'pt-14 md:pt-16'}`}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
