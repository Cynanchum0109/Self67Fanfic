
import React, { useState } from 'react';
import { BookOpen, List, Home, X } from 'lucide-react';
import { AppState } from '../types';

// 使用相对路径，适配本地、Vercel 和 GitHub Pages（项目根为 /Self67Fanfic/）
const MOMO67_ICON_URL = 'assets/icons/momo67.png';

interface LayoutProps {
  children: React.ReactNode;
  activeView: AppState;
  onNavigate: (view: AppState) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onNavigate }) => {
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
        className="fixed top-4 left-4 z-50 flex items-center justify-center p-2 bg-white rounded-lg shadow-md hover:bg-[#D4F4EC] transition-colors"
        aria-label="Toggle menu"
        style={{ width: '30px', height: '30px' }}
      >
        {isSidebarOpen ? (
          <X size={24} className="text-[#7B5B89]" />
        ) : (
          <img 
            src={MOMO67_ICON_URL}
            alt="Menu" 
            className="w-8 h-8"
            style={{ width: '32px', height: '32px', imageRendering: 'pixelated' }}
          />
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
      <aside className={`w-64 fixed inset-y-0 left-0 bg-white border-r border-[#E8F9F6] shadow-sm flex flex-col z-40 transition-transform duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-8">
          <h1 
            onClick={() => handleNavigate(AppState.HOME)}
            className="text-2xl font-bold tracking-tighter flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#6BD4C0] group-hover:bg-[#5FC4B0] transition-colors animate-pulse"></div>
              <span><span className="text-[#6BD4C0]">Hong</span><span className="text-[#7B5B89]">Cliff</span></span>
            </div>
            <img 
              src={MOMO67_ICON_URL}
              alt="Logo" 
              className="w-8 h-8"
              style={{ width: '32px', height: '32px', imageRendering: 'pixelated' }}
            />
          </h1>
          <p className="text-xs text-[#9D8AB5] mt-1 uppercase tracking-widest font-semibold">by BQCynanchum</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button
            onClick={() => handleNavigate(AppState.HOME)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
              activeView === AppState.HOME 
              ? 'bg-[#D4F4EC] text-[#7B5B89] font-medium' 
              : 'text-gray-600 hover:bg-[#E8F9F6] hover:text-[#7B5B89]'
            }`}
          >
            <Home size={20} />
            <span>Home</span>
          </button>
          
          <button
            onClick={() => handleNavigate(AppState.TOC)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
              activeView === AppState.TOC 
              ? 'bg-[#E8E0ED] text-[#7B5B89] font-medium' 
              : 'text-gray-600 hover:bg-[#F8F6FA] hover:text-[#7B5B89]'
            }`}
          >
            <List size={20} />
            <span>Contents</span>
          </button>

          {isReaderOrToc && (
            <button
              onClick={() => handleNavigate(AppState.READER)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                activeView === AppState.READER 
              ? 'bg-[#D4F4EC] text-[#7B5B89] font-medium' 
              : 'text-gray-600 hover:bg-[#E8F9F6] hover:text-[#7B5B89]'
              }`}
            >
              <BookOpen size={20} />
              <span>Reading</span>
            </button>
          )}
        </nav>

        <div className="p-6 border-t border-[#E8F9F6]">
          <p className="text-[10px] text-center text-gray-300">© 2026 BQCynanchum</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1">
        <div className={`max-w-5xl mx-auto p-8 md:p-12 lg:p-16 ${activeView === AppState.HOME ? 'flex items-center justify-center min-h-screen' : ''}`}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
