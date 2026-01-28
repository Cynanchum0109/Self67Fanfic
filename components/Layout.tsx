
import React from 'react';
import { BookOpen, List, Home, Github, Mail, Settings } from 'lucide-react';
import { AppState } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: AppState;
  onNavigate: (view: AppState) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onNavigate }) => {
  // We keep the library view hidden for the general user, but accessible if they know where to look (or for the author)
  const isReaderOrToc = activeView === AppState.READER || activeView === AppState.TOC;

  return (
    <div className="flex min-h-screen bg-[#FDFCFE]">
      {/* Fixed Sidebar */}
      <aside className="w-64 fixed inset-y-0 left-0 bg-white border-r border-emerald-50 shadow-sm flex flex-col z-10">
        <div className="p-8">
          <h1 
            onClick={() => onNavigate(AppState.HOME)}
            className="text-2xl font-bold tracking-tighter text-emerald-800 flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-3 h-3 rounded-full bg-emerald-300 group-hover:bg-purple-300 transition-colors animate-pulse"></div>
            MuseGarden
          </h1>
          <p className="text-xs text-purple-400 mt-1 uppercase tracking-widest font-semibold">Creator Haven</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button
            onClick={() => onNavigate(AppState.HOME)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
              activeView === AppState.HOME 
              ? 'bg-emerald-50 text-emerald-800 font-medium' 
              : 'text-gray-500 hover:bg-emerald-50/50 hover:text-emerald-700'
            }`}
          >
            <Home size={20} />
            <span>Home</span>
          </button>
          
          <button
            onClick={() => onNavigate(AppState.TOC)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
              activeView === AppState.TOC 
              ? 'bg-purple-50 text-purple-800 font-medium' 
              : 'text-gray-500 hover:bg-purple-50/50 hover:text-purple-700'
            }`}
          >
            <List size={20} />
            <span>Contents</span>
          </button>

          {isReaderOrToc && (
            <button
              onClick={() => onNavigate(AppState.READER)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                activeView === AppState.READER 
                ? 'bg-emerald-50 text-emerald-800 font-medium' 
                : 'text-gray-500 hover:bg-emerald-50/50 hover:text-emerald-700'
              }`}
            >
              <BookOpen size={20} />
              <span>Reading</span>
            </button>
          )}
        </nav>

        <div className="p-6 border-t border-gray-50">
          <button 
            onClick={() => onNavigate(AppState.LIBRARY)}
            className="mb-4 flex items-center gap-2 text-[10px] text-gray-300 hover:text-emerald-400 uppercase tracking-widest font-bold transition-colors"
          >
            <Settings size={12} /> Author Dashboard
          </button>
          <div className="flex justify-around text-gray-400">
            <a href="#" className="hover:text-emerald-500 transition-colors"><Github size={18} /></a>
            <a href="#" className="hover:text-purple-500 transition-colors"><Mail size={18} /></a>
          </div>
          <p className="text-[10px] text-center text-gray-300 mt-4">© 2024 MuseGarden</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-64 flex-1">
        <div className={`max-w-5xl mx-auto p-8 md:p-12 lg:p-16 ${activeView === AppState.HOME ? 'flex items-center justify-center min-h-screen' : ''}`}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
