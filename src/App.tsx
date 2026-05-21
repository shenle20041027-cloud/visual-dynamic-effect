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
import { CameraPanel } from '@/components/layout/CameraPanel'; // We will create this
import { ScreenPanel } from '@/components/layout/ScreenPanel';
import { ScreenOutput } from '@/components/screen/ScreenOutput';
import { Visualizer } from '@/components/visualizer/Visualizer';
import { MusicProjectBar } from '@/components/music/MusicProjectBar';
import { ShowControlBridge } from '@/components/ShowControlBridge';
import { Sparkles, Focus, Volume2, Type, Aperture, LayoutGrid, Monitor, Mic, MicOff, Music2, Radio } from 'lucide-react';
import { t } from '@/lib/i18n';
import { useScreenSync } from '@/lib/screenSync';
import { useApiAudioSource } from '@/lib/useApiAudioSource';
import type { VisualInputSource } from '@/store/useStore';

export default function App() {
  const screenMatch = window.location.pathname.match(/^\/screen\/([^/]+)/);

  if (screenMatch) {
    return <ScreenOutput screenId={decodeURIComponent(screenMatch[1])} />;
  }

  return <ControllerApp />;
}

function ControllerApp() {
  const {
    audioReady,
    setAudioReady,
    inputGain,
    language,
    setLanguage,
    isFullscreen,
    activeLeftPanel,
    setActiveLeftPanel,
    visualInputSource,
    setVisualInputSource,
    musicPanelOpen,
    setMusicPanelOpen,
  } = useStore();
  const [initError, setInitError] = useState('');
  const i18n = t[language];
  useScreenSync('controller');
  useApiAudioSource(visualInputSource === 'api');

  useEffect(() => {
    let animationFrameId: number;
    
    const renderLoop = () => {
      const state = useStore.getState();
      audioEngine.update(state.inputGain, {
        subBassSense: state.subBassSense,
        bassSense: state.bassSense,
        midSense: state.midSense,
        trebleSense: state.trebleSense,
        noiseGate: state.noiseGate,
        beatMultiplier: state.beatMultiplier
      });

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    if (audioReady) {
      renderLoop();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [audioReady]);

  const activateMic = async () => {
    try {
      await audioEngine.initialize();
      setAudioReady(true);
      setVisualInputSource('mic');
      setInitError('');
    } catch (err: any) {
      setInitError('Failed to access microphone. Please allow permissions.');
    }
  };

  const deactivateMic = () => {
    audioEngine.destroy();
    setAudioReady(false);
    if (visualInputSource === 'mic') setVisualInputSource('api');
  };

  const selectInputSource = (source: VisualInputSource) => {
    if (source === 'mic') {
      void activateMic();
      return;
    }
    setVisualInputSource(source);
  };

  // Left Dock specific rendering
  const renderLeftPanelContent = () => {
    switch (activeLeftPanel) {
      case 'Audio': return <AudioPanel />;
      case 'Text': return <TextPanel />;
      case 'Camera': return <CameraPanel />;
      case 'Screens': return <ScreenPanel />;
      case 'Presets': return <PresetPanel />;
      default: return <PresetPanel />;
    }
  };

  return (
    <div className="w-screen h-screen bg-[#020202] text-white flex flex-col font-sans overflow-hidden">
      <ShowControlBridge />
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[200px] bg-purple-500/5 blur-[150px] pointer-events-none" />

      {/* TOP STATUS BAR */}
      {!isFullscreen && (
        <header className="h-12 w-full flex items-center justify-between px-6 border-b border-white/10 bg-[#050505]/90 backdrop-blur-md z-20 shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-6 h-6 bg-white text-black rounded-sm flex items-center justify-center">
                <Sparkles size={14} />
             </div>
             <h1 className="text-xs font-bold tracking-widest uppercase">{i18n.APP_HEADER || 'Nexus.VJ Workstation'}</h1>
          </div>
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/40 p-1">
               {[
                 { source: 'mic' as const, label: 'MIC', icon: audioReady ? <Mic size={13} /> : <MicOff size={13} /> },
                 { source: 'music' as const, label: 'MUSIC DEBUG', icon: <Music2 size={13} /> },
                 { source: 'api' as const, label: 'SHOW API', icon: <Radio size={13} /> },
               ].map((option) => (
                 <button
                   key={option.source}
                   onClick={() => selectInputSource(option.source)}
                   className={`flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                     visualInputSource === option.source
                       ? 'bg-white text-black'
                       : 'text-white/45 hover:bg-white/10 hover:text-white'
                   }`}
                 >
                   {option.icon}
                   {option.label}
                 </button>
               ))}
               {audioReady && (
                 <button
                   onClick={deactivateMic}
                   className="flex h-7 items-center justify-center rounded-md px-2 text-[10px] font-bold uppercase tracking-widest text-white/45 hover:bg-red-500/20 hover:text-red-200"
                   title="Stop microphone"
                 >
                   <MicOff size={13} />
                 </button>
               )}
             </div>
             <div className="flex items-center gap-2 text-[10px] font-bold text-white/50 uppercase tracking-widest">
               <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
               {i18n.LIVE_ENGINE_STATUS || 'Live Engine Status: Optimal'}
             </div>
             <button 
                onClick={() => setLanguage(language === 'EN' ? 'ZH' : 'EN')}
                className="text-[11px] font-bold text-white/60 hover:text-white hover:bg-white/10 transition-colors border border-white/20 px-3 py-1 bg-black/50 rounded-lg shadow-sm"
              >
                {language === 'EN' ? '[ 中文 / EN ]' : '[ EN / 中文 ]'}
              </button>
          </div>
        </header>
      )}

      {/* MAIN WORKSPACE REGION */}
      <div className="flex-1 w-full relative overflow-hidden flex min-h-0">
         
         {/* LEFT DOCK (Fixed) */}
         {!isFullscreen && (
           <div className="w-14 h-full bg-[#050505] border-r border-white/10 flex flex-col items-center py-4 gap-4 z-20 shrink-0">
              <button 
                onClick={() => setActiveLeftPanel('Presets')} 
                className={`p-2.5 rounded-lg transition-all ${activeLeftPanel==='Presets' ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setActiveLeftPanel('Audio')} 
                className={`p-2.5 rounded-lg transition-all ${activeLeftPanel==='Audio' ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                <Volume2 size={18} />
              </button>
              <button 
                onClick={() => setActiveLeftPanel('Text')} 
                className={`p-2.5 rounded-lg transition-all ${activeLeftPanel==='Text' ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                <Type size={18} />
              </button>
              <button 
                onClick={() => setActiveLeftPanel('Camera')} 
                className={`p-2.5 rounded-lg transition-all ${activeLeftPanel==='Camera' ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                <Aperture size={18} />
              </button>
              <button 
                onClick={() => setActiveLeftPanel('Screens')} 
                className={`p-2.5 rounded-lg transition-all ${activeLeftPanel==='Screens' ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                <Monitor size={18} />
              </button>
           </div>
         )}
         
         {/* RESIZABLE PANELS REPLACED WITH STANDARD FLEX */}
         <div className="flex-1 flex w-full min-h-0">
            
            {/* LEFT CONFIG PANEL */}
            {!isFullscreen && (
              <div className="w-[300px] shrink-0 bg-[#0a0a0c] relative z-10 flex flex-col border-r border-white/10">
                 <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 pointer-events-auto">
                   {renderLeftPanelContent()}
                 </div>
              </div>
            )}

            {/* CENTER CANVAS & TIMELINE */}
            <div className="flex-1 bg-black relative group flex flex-col min-w-0">
               {!isFullscreen && visualInputSource === 'music' && (
                 musicPanelOpen ? (
                   <div className="contents">
                     <div className="relative">
                       <MusicProjectBar />
                       <button
                         type="button"
                         onClick={() => setMusicPanelOpen(false)}
                         className="absolute right-3 top-3 z-20 rounded-md border border-white/10 bg-black/60 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-white/50 hover:bg-white hover:text-black"
                       >
                         Hide
                       </button>
                     </div>
                   </div>
                 ) : (
                   <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-[#050505] px-4">
                     <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/45">
                       <Music2 size={14} className="text-emerald-300" />
                       Built-in Music Debug
                     </div>
                     <button
                       type="button"
                       onClick={() => setMusicPanelOpen(true)}
                       className="rounded-md bg-emerald-300 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-black"
                     >
                       Show Panel
                     </button>
                   </div>
                 )
               )}
               <div className="flex-1 relative min-h-0">
                 <Visualizer />
                 {initError && visualInputSource === 'mic' && (
                   <div className="absolute left-4 top-4 z-50 rounded-lg border border-red-400/30 bg-red-500/15 px-3 py-2 text-xs font-bold text-red-100">
                     {initError}
                   </div>
                 )}
                 
                 {/* Fullscreen UI trigger */}
                  <button 
                    onClick={() => useStore.getState().setIsFullscreen(!isFullscreen)}
                    className="absolute bottom-6 right-6 z-50 p-4 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 shadow-[0_0_30px_rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 hover:scale-110 transition-all hover:bg-white hover:text-black"
                  >
                    <Focus size={20} />
                  </button>
               </div>
               
               {!isFullscreen && (
                 <div className="h-[120px] shrink-0 bg-[#050505] relative overflow-hidden border-t border-white/10 flex flex-col">
                    <div className="flex items-center px-4 h-8 bg-white/5 border-b border-white/5 shrink-0">
                       <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">{i18n.SCENE_TIMELINE || 'Performance Timeline'}</span>
                    </div>
                    <div className="flex-1 p-4 flex flex-col justify-center gap-2 overflow-hidden opacity-50 pointer-events-none">
                       {/* Decorative timeline tracks */}
                       <div className="w-full h-4 bg-white/5 rounded-full flex items-center px-2 border border-white/5">
                         <div className="w-32 h-1.5 bg-blue-500 rounded-full shrink-0" />
                         <div className="w-16 h-1.5 bg-purple-500 rounded-full shrink-0 ml-4" />
                       </div>
                       <div className="w-full h-4 bg-white/5 rounded-full flex items-center px-2 border border-white/5">
                         <div className="w-8 h-1.5 bg-pink-500 rounded-full shrink-0 ml-8" />
                         <div className="w-64 h-1.5 bg-green-500 rounded-full shrink-0 ml-12" />
                       </div>
                       <div className="w-full h-4 bg-white/5 rounded-full flex items-center px-2 border border-white/5">
                         <div className="w-full h-1.5 bg-white/20 rounded-full shrink-0 ml-16" />
                       </div>
                    </div>
                 </div>
               )}
            </div>

            {/* RIGHT GLOBAL PANEL */}
            {!isFullscreen && (
              <div className="w-[340px] shrink-0 bg-[#0a0a0c] z-10 flex flex-col border-l border-white/10">
                <div className="flex-1 overflow-y-auto custom-scrollbar pb-32 pointer-events-auto">
                   <ScenePanel />
                   <div className="h-px w-full bg-white/5" />
                   <ColorPanel />
                   <div className="h-px w-full bg-white/5" />
                   <FxPanel />
                   <div className="h-px w-full bg-white/5" />
                   <ControlPanel />
                </div>
              </div>
            )}
            
         </div>
      </div>

    </div>
  );
}
