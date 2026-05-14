import React, { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { audioEngine } from '@/lib/AudioEngine';
import { AudioPanel } from '@/components/layout/AudioPanel';
import { FxPanel } from '@/components/layout/FxPanel';
import { ScenePanel } from '@/components/layout/ScenePanel';
import { TextPanel } from '@/components/layout/TextPanel';
import { PresetPanel } from '@/components/layout/PresetPanel';
import { ColorPanel } from '@/components/layout/ColorPanel';
import { ControlPanel } from '@/components/layout/ControlPanel';
import { Visualizer } from '@/components/visualizer/Visualizer';
import { Play, Settings2, Sparkles, Monitor, Focus } from 'lucide-react';
import { t } from '@/lib/i18n';

export default function App() {
  const { audioReady, setAudioReady, inputGain, language, setLanguage, isFullscreen } = useStore();
  const [initError, setInitError] = useState('');
  const i18n = t[language];

  useEffect(() => {
    let animationFrameId: number;
    
    const renderLoop = () => {
      const currentGain = useStore.getState().inputGain;
      audioEngine.update(currentGain);
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    if (audioReady) {
      renderLoop();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [audioReady]);

  const handleStart = async () => {
    try {
      await audioEngine.initialize();
      setAudioReady(true);
    } catch (err: any) {
      setInitError('Failed to access microphone. Please allow permissions.');
    }
  };

  if (!audioReady) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-black text-white relative overflow-hidden">
        {/* Sleek blurred backgrounds */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600/30 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/30 blur-[120px] pointer-events-none" />
        
        <div className="z-10 flex flex-col items-center max-w-2xl text-center">
          <div className="mb-6 w-12 h-12 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center shadow-2xl">
            <Sparkles className="text-white w-6 h-6" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
            {i18n.APP_TITLE || 'Visual Interface'}
          </h1>
          <p className="text-white/50 mb-12 text-lg font-medium">
            Professional spatial visual engine powered by real-time audio and AI.
          </p>
          
          <button 
            onClick={handleStart}
            className="group relative px-8 py-4 bg-white text-black font-semibold rounded-full overflow-hidden hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.3)]"
          >
            <div className="relative flex items-center gap-3">
              <Play fill="currentColor" size={18} />
              <span>Initialize Engine</span>
            </div>
          </button>
          
          {initError && <p className="text-red-400 mt-6 text-sm bg-red-400/10 px-4 py-2 rounded-full border border-red-400/20">{initError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-[#030205] text-white flex p-4 gap-4 font-sans overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-48 bg-purple-500/10 blur-[100px]" />
      </div>

      {/* LEFT PANEL */}
      <aside className={`w-[340px] flex flex-col gap-4 z-10 transition-transform duration-500 ${isFullscreen ? '-translate-x-[120%]' : 'translate-x-0'}`}>
        {/* Header Block */}
        <div className="bg-[#0a0a0c]/80 backdrop-blur-3xl border border-white/10 rounded-2xl p-6 shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                <Sparkles size={16} />
             </div>
             <div>
                <h1 className="text-sm font-bold tracking-wide">Nexus.VJ</h1>
                <p className="text-[10px] text-white/50 uppercase tracking-widest">{i18n.LIVE_ENGINE_ACTIVE}</p>
             </div>
          </div>
          <button 
            onClick={() => setLanguage(language === 'EN' ? 'ZH' : 'EN')}
            className="text-[10px] uppercase font-bold text-white/40 hover:text-white transition-colors"
          >
            {language}
          </button>
        </div>

        {/* Tools Block */}
        <div className="flex-1 overflow-y-auto w-full bg-[#0a0a0c]/80 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl no-scrollbar flex flex-col">
          <AudioPanel />
          <div className="h-px w-full bg-white/5" />
          <TextPanel />
          <div className="h-px w-full bg-white/5" />
          <PresetPanel />
        </div>
      </aside>

      {/* MAIN VISUALIZER WORKSPACE */}
      <main className="flex-1 relative z-10 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black group">
        <Visualizer />
        
        {/* HUD Overlay */}
        {!isFullscreen && (
          <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/50">
             <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
             Rendering at 60fps
          </div>
        )}
      </main>

      {/* RIGHT PANEL */}
      <aside className={`w-[340px] flex flex-col gap-4 z-10 transition-transform duration-500 ${isFullscreen ? 'translate-x-[120%]' : 'translate-x-0'}`}>
        <div className="flex-1 overflow-y-auto w-full bg-[#0a0a0c]/80 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl no-scrollbar flex flex-col">
          <ScenePanel />
          <div className="h-px w-full bg-white/5" />
          <ColorPanel />
          <div className="h-px w-full bg-white/5" />
          <FxPanel />
          <div className="h-px w-full bg-white/5" />
          <ControlPanel />
        </div>

        {/* Mini Status Footer */}
        <div className="bg-[#0a0a0c]/80 backdrop-blur-3xl border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-2">
          <div className="flex justify-between text-[10px] font-bold text-white/40 uppercase tracking-widest">
            <span>CPU</span>
            <span className="text-white">14%</span>
          </div>
          <div className="flex justify-between text-[10px] font-bold text-white/40 uppercase tracking-widest">
            <span>MEM</span>
            <span className="text-white">2.1GB</span>
          </div>
        </div>
      </aside>
      
      {/* Fullscreen UI trigger */}
      <button 
        onClick={() => useStore.setState({ isFullscreen: !isFullscreen })}
        className="absolute bottom-8 right-8 z-50 p-4 rounded-full bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.4)] opacity-0 group-hover:opacity-100 hover:scale-110 transition-all hover:opacity-100"
      >
        <Focus size={24} />
      </button>

    </div>
  );
}

