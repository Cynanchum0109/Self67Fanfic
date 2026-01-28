
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import MarkdownRenderer from './components/MarkdownRenderer';
import { Story, AppState } from './types';
import { Trash2, BookOpen, Quote, Clock, Upload, ArrowRight } from 'lucide-react';

const App: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<AppState>(AppState.HOME);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('musegarden_stories');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setStories(parsed);
        if (parsed.length > 0 && !activeStoryId) setActiveStoryId(parsed[0].id);
      } catch (e) {
        console.error("Failed to load stories", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('musegarden_stories', JSON.stringify(stories));
  }, [stories]);

  const activeStory = stories.find(s => s.id === activeStoryId);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const firstLine = text.split('\n')[0];
        const title = firstLine.startsWith('# ') 
          ? firstLine.replace('# ', '') 
          : file.name.replace('.md', '');

        const newStory: Story = {
          id: Math.random().toString(36).substr(2, 9),
          title,
          content: text,
          fileName: file.name,
          uploadDate: Date.now()
        };
        
        setStories(prev => {
          if (prev.find(p => p.fileName === file.name)) return prev;
          return [...prev, newStory];
        });
      };
      reader.readAsText(file);
    });
  };

  const deleteStory = (id: string) => {
    setStories(prev => prev.filter(s => s.id !== id));
    if (activeStoryId === id) setActiveStoryId(null);
  };

  const getStoryPreview = (content: string) => {
    const lines = content.split('\n');
    // Skip headers and empty lines to find the first real paragraph
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        return trimmed.length > 150 ? trimmed.substring(0, 150) + '...' : trimmed;
      }
    }
    return "No preview available.";
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

  const renderTOC = () => (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="border-b border-gray-50 pb-10">
        <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-500 mb-2">Table of Contents</h2>
        <h1 className="text-5xl font-bold text-emerald-950">Collection of Works</h1>
      </header>

      <div className="grid grid-cols-1 gap-12">
        {stories.map((story, index) => (
          <div 
            key={story.id}
            onClick={() => { setActiveStoryId(story.id); setCurrentView(AppState.READER); }}
            className="group cursor-pointer flex flex-col md:flex-row gap-8 items-start"
          >
            <div className="text-5xl font-black text-emerald-50 opacity-0 group-hover:opacity-100 transition-all duration-500 serif-text">
              {(index + 1).toString().padStart(2, '0')}
            </div>
            <div className="flex-1 space-y-3">
              <h3 className="text-3xl font-bold text-gray-800 group-hover:text-purple-600 transition-colors">
                {story.title}
              </h3>
              <p className="text-gray-500 leading-relaxed serif-text line-clamp-2 italic">
                {getStoryPreview(story.content)}
              </p>
              <div className="flex items-center gap-4 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  {new Date(story.uploadDate).toLocaleDateString()}
                </span>
                <span className="w-10 h-[1px] bg-emerald-100 group-hover:w-20 transition-all duration-500"></span>
              </div>
            </div>
          </div>
        ))}

        {stories.length === 0 && (
          <div className="py-32 text-center text-gray-400 border-2 border-dashed border-emerald-50 rounded-3xl">
            <p>The garden is currently resting. Please check back later.</p>
            <p className="text-xs mt-2 uppercase tracking-widest">(Add stories via Author Dashboard)</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderReader = () => (
    <div className="flex gap-12 animate-in slide-in-from-right duration-500">
      <div className="flex-1 max-w-3xl">
        {activeStory ? (
          <div className="space-y-12">
            <header className="border-b border-gray-50 pb-8">
              <div className="flex items-center gap-2 text-xs text-emerald-500 font-bold uppercase tracking-widest mb-4">
                <Quote size={14} /> Chapter Reading
              </div>
              <h1 className="text-5xl font-bold text-emerald-950 mb-2">{activeStory.title}</h1>
              <div className="flex items-center gap-4 text-gray-400 text-sm">
                <span className="flex items-center gap-1"><Clock size={14} /> {Math.ceil(activeStory.content.split(' ').length / 200)} min read</span>
                <span className="w-1 h-1 rounded-full bg-gray-200"></span>
                <span>{activeStory.content.length} characters</span>
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

  const renderLibrary = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-bold text-emerald-950">Author Dashboard</h1>
          <p className="text-gray-500 mt-2">Manage the source files for your Garden.</p>
        </div>
        <div className="relative">
          <input 
            type="file" 
            id="file-upload" 
            multiple 
            accept=".md" 
            className="hidden" 
            onChange={handleFileUpload} 
          />
          <label 
            htmlFor="file-upload" 
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-2xl font-bold cursor-pointer hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-100"
          >
            <Upload size={18} /> Import Stories
          </label>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {stories.map(story => (
          <div 
            key={story.id} 
            className="group flex items-center justify-between p-6 bg-white border border-gray-100 rounded-3xl hover:border-purple-200 transition-all"
          >
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <BookOpen size={24} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-800">{story.title}</h4>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                  <span>{story.fileName}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-200"></span>
                  <span>{new Date(story.uploadDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => { setActiveStoryId(story.id); setCurrentView(AppState.READER); }}
                className="px-4 py-2 text-emerald-600 bg-emerald-50 rounded-xl font-bold hover:bg-emerald-100"
              >
                Preview
              </button>
              <button 
                onClick={() => deleteStory(story.id)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Layout activeView={currentView} onNavigate={(view) => setCurrentView(view)}>
      {currentView === AppState.HOME && renderHome()}
      {currentView === AppState.TOC && renderTOC()}
      {currentView === AppState.READER && renderReader()}
      {currentView === AppState.LIBRARY && renderLibrary()}
    </Layout>
  );
};

export default App;
