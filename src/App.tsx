import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { audioEngine } from '@/lib/AudioEngine';
import { AudioPanel } from '@/components/layout/AudioPanel';
import { FxPanel } from '@/components/layout/FxPanel';
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
import { ChevronDown, ChevronUp, SlidersHorizontal, Sparkles, Focus, Volume2, Type, Aperture, LayoutGrid, Monitor, Mic, MicOff, Music2, Radio } from 'lucide-react';
import { t } from '@/lib/i18n';
import { useScreenSync } from '@/lib/screenSync';
import { useApiAudioSource } from '@/lib/useApiAudioSource';
import type { VisualInputSource } from '@/store/useStore';
import type { AudioDebugSnapshot } from '@/lib/AudioEngine';

export default function App() {
  const screenMatch = window.location.pathname.match(/^\/screen\/([^/]+)/);

  if (screenMatch) {
    return <ScreenApp screenId={decodeURIComponent(screenMatch[1])} />;
  }

  return <ControllerApp />;
}

function ScreenApp({ screenId }: { screenId: string }) {
  useApiAudioSource(true);

  return (
    <>
      <ShowControlBridge showStatus={false} />
      <ScreenOutput screenId={screenId} />
    </>
  );
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
  const [audioDebug, setAudioDebug] = useState<AudioDebugSnapshot>(() => audioEngine.getDebugSnapshot());
  const lastAudioDebugUpdateRef = useRef(0);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(Boolean(document.fullscreenElement));
  const i18n = t[language];
  useScreenSync('controller');
  useApiAudioSource(visualInputSource === 'api');

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

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
      const now = performance.now();
      if (now - lastAudioDebugUpdateRef.current > 120) {
        lastAudioDebugUpdateRef.current = now;
        setAudioDebug(audioEngine.getDebugSnapshot());
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    const updateViewport = () => {
      document.documentElement.style.setProperty('--vj-vh', `${window.innerHeight}px`);
      const isLandscape = window.innerWidth > window.innerHeight;
      if (isLandscape) setMobileControlsOpen(false);
    };
    const updateFullscreen = () => setIsBrowserFullscreen(Boolean(document.fullscreenElement));
    updateViewport();
    updateFullscreen();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    document.addEventListener('fullscreenchange', updateFullscreen);
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      document.removeEventListener('fullscreenchange', updateFullscreen);
    };
  }, []);

  const toggleFullscreenView = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        useStore.getState().setIsFullscreen(false);
      } else {
        await document.documentElement.requestFullscreen();
        useStore.getState().setIsFullscreen(true);
        setMobileControlsOpen(false);
      }
    } catch {
      useStore.getState().setIsFullscreen(!isFullscreen);
      setMobileControlsOpen(false);
    }
  };

  const getMicErrorMessage = (err: unknown) => {
    const name = err && typeof err === 'object' && 'name' in err ? String((err as any).name) : '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return language === 'ZH'
        ? '麦克风权限被拒绝，请在浏览器地址栏允许麦克风后重试。'
        : 'Microphone permission was denied. Allow microphone access in the browser and try again.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return language === 'ZH'
        ? '没有检测到可用麦克风。'
        : 'No available microphone was found.';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return language === 'ZH'
        ? '麦克风正在被其他程序占用，请关闭占用后重试。'
        : 'The microphone is in use by another app. Close it and try again.';
    }
    return language === 'ZH'
      ? '麦克风启动失败，请检查浏览器权限和输入设备。'
      : 'Could not start the microphone. Check browser permissions and input device.';
  };

  const getReadableMicErrorMessage = (err: unknown) => {
    const name = err && typeof err === 'object' && 'name' in err ? String((err as any).name) : '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return language === 'ZH' ? '麦克风权限被拒绝，请在浏览器地址栏允许麦克风后重试。' : 'Microphone permission was denied. Allow microphone access in the browser and try again.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return language === 'ZH' ? '没有检测到可用麦克风。' : 'No available microphone was found.';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return language === 'ZH' ? '麦克风可能正被其他程序占用，请关闭占用后重试。' : 'The microphone is in use by another app. Close it and try again.';
    }
    if (err instanceof Error && err.message.includes('localhost or HTTPS')) {
      return language === 'ZH' ? '麦克风权限需要 localhost 或 HTTPS 环境。请使用 http://localhost:4302 或 HTTPS 访问。' : 'Microphone access requires localhost or HTTPS. Use http://localhost:4302 or HTTPS.';
    }
    return language === 'ZH' ? '麦克风启动失败，请检查浏览器权限和输入设备。' : 'Could not start the microphone. Check browser permissions and input device.';
  };

  const activateMic = async () => {
    setVisualInputSource('mic');
    setAudioReady(false);
    setInitError('');
    setAudioDebug({ ...audioEngine.getDebugSnapshot(), status: 'requesting', message: 'Waiting for microphone permission.' });
    try {
      window.dispatchEvent(new Event('vj:stop-music'));
      await audioEngine.startMicrophone();
      setAudioReady(true);
      setInitError('');
      setAudioDebug(audioEngine.getDebugSnapshot());
    } catch (err: any) {
      setAudioReady(false);
      setInitError(getReadableMicErrorMessage(err));
      setAudioDebug(audioEngine.getDebugSnapshot());
    }
  };

  const deactivateMic = () => {
    audioEngine.stopCurrentAudioSource();
    setAudioReady(false);
    setAudioDebug(audioEngine.getDebugSnapshot());
    if (visualInputSource === 'mic') setVisualInputSource('api');
  };

  const selectInputSource = (source: VisualInputSource) => {
    if (source === 'mic') {
      void activateMic();
      return;
    }
    audioEngine.stopCurrentAudioSource();
    setAudioReady(false);
    setInitError('');
    setAudioDebug(audioEngine.getDebugSnapshot());
    if (source !== 'music') window.dispatchEvent(new Event('vj:stop-music'));
    setVisualInputSource(source);
  };

  useEffect(() => {
    const handleSelectInput = (event: Event) => {
      const source = (event as CustomEvent<VisualInputSource>).detail;
      if (source === 'mic' || source === 'music' || source === 'api') {
        selectInputSource(source);
      }
    };
    const handleStopMic = () => {
      audioEngine.stopCurrentAudioSource();
      setAudioReady(false);
      setInitError('');
      setAudioDebug(audioEngine.getDebugSnapshot());
    };

    window.addEventListener('vj:select-input', handleSelectInput);
    window.addEventListener('vj:stop-mic', handleStopMic);
    return () => {
      window.removeEventListener('vj:select-input', handleSelectInput);
      window.removeEventListener('vj:stop-mic', handleStopMic);
    };
  }, [visualInputSource]);

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

  const micStatusText = (() => {
    if (visualInputSource !== 'mic') return language === 'ZH' ? '未连接' : 'Not connected';
    if (audioDebug.status === 'requesting') return language === 'ZH' ? '等待授权' : 'Waiting for permission';
    if (audioDebug.status === 'connected') return language === 'ZH' ? '麦克风已连接' : 'Microphone connected';
    if (audioDebug.status === 'receiving') return language === 'ZH' ? '正在接收声音' : 'Receiving sound';
    if (audioDebug.status === 'low') return language === 'ZH' ? '输入音量过低' : 'Input volume too low';
    if (audioDebug.status === 'error') return language === 'ZH' ? '麦克风错误' : 'Microphone error';
    return language === 'ZH' ? '未连接' : 'Not connected';
  })();

  return (
    <div className="w-screen h-[100dvh] min-h-[100svh] bg-[#020202] text-white flex flex-col font-sans overflow-hidden">
      <ShowControlBridge />
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[200px] bg-purple-500/5 blur-[150px] pointer-events-none" />

      {/* TOP STATUS BAR */}
      {!isFullscreen && (
        <header className="h-12 w-full flex items-center justify-between gap-3 px-3 md:px-6 border-b border-white/10 bg-[#050505]/90 backdrop-blur-md z-20 shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-6 h-6 bg-white text-black rounded-sm flex items-center justify-center">
                <Sparkles size={14} />
             </div>
             <h1 className="truncate text-[10px] md:text-xs font-bold tracking-widest uppercase">{i18n.APP_HEADER || 'Nexus.VJ Workstation'}</h1>
          </div>
          <div className="flex min-w-0 items-center gap-2 md:gap-6">
             <div className="hidden sm:flex items-center gap-1 rounded-lg border border-white/10 bg-black/40 p-1">
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
             <div className="hidden lg:flex items-center gap-2 text-[10px] font-bold text-white/50 uppercase tracking-widest">
               <div className={`w-1.5 h-1.5 rounded-full ${
                 visualInputSource === 'mic' && audioDebug.status === 'receiving'
                   ? 'bg-green-400 animate-pulse'
                   : visualInputSource === 'mic' && (audioDebug.status === 'requesting' || audioDebug.status === 'connected')
                     ? 'bg-yellow-300'
                     : visualInputSource === 'mic' && (audioDebug.status === 'low' || audioDebug.status === 'error')
                       ? 'bg-red-400'
                       : 'bg-green-500 animate-pulse'
               }`} />
               {visualInputSource === 'mic' ? `MIC: ${micStatusText}` : (i18n.LIVE_ENGINE_STATUS || 'Live Engine Status: Optimal')}
             </div>
             <button 
                onClick={() => setLanguage(language === 'EN' ? 'ZH' : 'EN')}
                className="min-h-11 md:min-h-9 text-[11px] font-bold text-white/60 hover:text-white hover:bg-white/10 transition-colors border border-white/20 px-3 py-1 bg-black/50 rounded-lg shadow-sm"
              >
                {language === 'EN' ? '[ 中文 / EN ]' : '[ EN / 中文 ]'}
              </button>
          </div>
        </header>
      )}

      {/* MAIN WORKSPACE REGION */}
      <div className="flex-1 w-full relative overflow-hidden flex min-h-0">
         
         {/* LEFT DOCK (Fixed) */}
         {!isFullscreen && !isMobile && (
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
            {!isFullscreen && !isMobile && (
              <div className="w-[300px] shrink-0 bg-[#0a0a0c] relative z-10 flex flex-col border-r border-white/10">
                 <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 pointer-events-auto">
                   {renderLeftPanelContent()}
                 </div>
              </div>
            )}

            {/* CENTER CANVAS & TIMELINE */}
            <div className="flex-1 bg-black relative group flex flex-col min-w-0">
               {!isFullscreen && !isMobile && visualInputSource === 'music' && (
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
                 {visualInputSource === 'mic' && !initError && (
                   <div className="absolute left-4 top-4 z-50 min-w-[240px] rounded-lg border border-white/10 bg-black/65 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/70 backdrop-blur-md">
                     <div className="flex items-center justify-between gap-3">
                       <span>{micStatusText}</span>
                       <span className="text-white/40">ctx {audioDebug.contextState}</span>
                     </div>
                     <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono normal-case tracking-normal text-white/45">
                       <span>raw {audioDebug.rawVolume.toFixed(3)}</span>
                       <span>rms {audioDebug.rawRms.toFixed(3)}</span>
                       <span>delta {audioDebug.frequencyDelta.toFixed(3)}</span>
                       <span>bin {audioDebug.peakFrequencyBin}</span>
                       <span>stream {audioDebug.streamActive ? 'live' : 'off'}</span>
                       <span>freq {audioDebug.frequencyChanged ? 'moving' : 'flat'}</span>
                     </div>
                   </div>
                 )}
                 
                 {/* Fullscreen UI trigger */}
                  <button 
                    onClick={toggleFullscreenView}
                    className="absolute bottom-20 right-4 md:bottom-6 md:right-6 z-40 min-h-11 min-w-11 p-3 md:p-4 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 shadow-[0_0_30px_rgba(0,0,0,0.5)] md:opacity-0 md:group-hover:opacity-100 hover:scale-110 transition-all hover:bg-white hover:text-black"
                    title={isBrowserFullscreen || isFullscreen ? 'Exit fullscreen' : 'Fullscreen view'}
                  >
                    <Focus size={20} />
                  </button>
               </div>
            </div>

            {/* RIGHT GLOBAL PANEL */}
            {!isFullscreen && !isMobile && (
              <div className="w-[340px] shrink-0 bg-[#0a0a0c] z-10 flex flex-col border-l border-white/10">
                <div className="flex-1 overflow-y-auto custom-scrollbar pb-32 pointer-events-auto">
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

      {!isFullscreen && isMobile && (
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setMobileControlsOpen((open) => !open)}
            className="fixed bottom-4 left-1/2 z-50 flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-white px-5 text-[11px] font-black uppercase tracking-widest text-black shadow-[0_0_28px_rgba(0,0,0,0.5)]"
            aria-expanded={mobileControlsOpen}
          >
            <SlidersHorizontal size={16} />
            {mobileControlsOpen ? (language === 'ZH' ? '收起控制面板' : 'Hide Controls') : (language === 'ZH' ? '展开控制面板' : 'Show Controls')}
            {mobileControlsOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>

          <div
            className={`fixed inset-x-0 bottom-0 z-40 max-h-[82dvh] rounded-t-2xl border-t border-white/15 bg-[#08080a]/95 shadow-[0_-24px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl transition-transform duration-300 ${
              mobileControlsOpen ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none'
            }`}
          >
            <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-white/25" />
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2 overflow-x-auto no-scrollbar">
                {[
                  { id: 'Presets', icon: LayoutGrid },
                  { id: 'Audio', icon: Volume2 },
                  { id: 'Text', icon: Type },
                  { id: 'Camera', icon: Aperture },
                  { id: 'Screens', icon: Monitor },
                ].map(({ id, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setActiveLeftPanel(id);
                      setMobileControlsOpen(true);
                    }}
                    className={`flex h-11 min-w-11 items-center justify-center rounded-xl border transition-colors ${
                      activeLeftPanel === id ? 'border-white bg-white text-black' : 'border-white/10 bg-white/5 text-white/55'
                    }`}
                    aria-label={id}
                  >
                    <Icon size={18} />
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-[calc(82dvh-72px)] overflow-y-auto overscroll-contain custom-scrollbar px-1 pb-24">
              {visualInputSource === 'music' && <MusicProjectBar />}
              {renderLeftPanelContent()}
              <div className="h-px w-full bg-white/5" />
              <ColorPanel />
              <div className="h-px w-full bg-white/5" />
              <FxPanel />
              <div className="h-px w-full bg-white/5" />
              <ControlPanel />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
