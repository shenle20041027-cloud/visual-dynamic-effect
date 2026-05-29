import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { createShowControlClient, type ControlCommand } from '@/lib/showControlClient';
import { ShowRuntimeSettingsPanel } from '@/components/ShowRuntimeSettingsPanel';
import type { AudioDriveMode } from '@/lib/audioDrive';
import type { VisualInputSource } from '@/store/useStore';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const toNumber = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const scenePresetMap: Record<string, string> = {
  Cyber: 'Cyberpunk',
  Liquid: 'Liquid Dream',
  Chromaflux: 'Chromaflux',
  'Blue Font': 'Blue Font',
  Topology: 'Sonic Topology',
  Pulse: 'Neon Pulse',
  Void: 'Dark Space',
  Dumbar: 'Dumbar Base',
};

const createIdFragment = () => {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? uuid.slice(0, 8) : Math.random().toString(36).slice(2, 10);
};

export function ShowControlBridge({ showStatus = true }: { showStatus?: boolean }) {
  const clientRef = useRef<ReturnType<typeof createShowControlClient> | null>(null);
  const clientIdRef = useRef(`vj-visual-dynamic-effect-${createIdFragment()}`);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');
  const store = useStore();

  useEffect(() => {
    clientRef.current = createShowControlClient({
      module: 'visual',
      clientId: clientIdRef.current,
      role: 'vj',
      capabilities: ['module.statePatch', 'control.command', 'visual.scene', 'visual.fx', 'visual.text'],
      onStatus: setStatus,
      onCommand: (command) => applyVisualCommand(command),
    });

    return () => clientRef.current?.close();
  }, []);

  const patch = useMemo(() => ({
    status: 'online',
    scene: store.currentScene,
    preset: store.textAnimStyle,
    colors: {
      base: store.baseColor,
      secondary: store.secondaryColor,
      accent: store.accentColor,
      background: store.bgColor,
    },
    fx: {
      bloomIntensity: store.bloomIntensity,
      rgbSplitAmount: store.rgbSplitAmount,
      distortion: store.distortion,
      glitchActive: store.glitchActive,
      speed: store.speed,
      chaos: store.chaos,
      saturation: store.saturation,
      contrast: store.contrast,
      brightness: store.brightness,
      exposure: store.exposure,
    },
    text: {
      value: store.textInput,
      animation: store.textAnimStyle,
      reactive: store.textReactive,
      glow: store.textGlow,
      speed: store.textSpeed,
      fontSize: store.textFontSize,
      fontWeight: store.textFontWeight,
      letterSpacing: store.textLetterSpacing,
    },
    audioDriveMode: store.audioDriveMode,
    inputSource: store.visualInputSource,
    fullscreen: store.isFullscreen,
    visualMemories: store.visualMemories.map((memory) => ({
      id: memory.id,
      name: memory.name,
      scene: memory.currentScene,
    })),
  }), [
    store.currentScene,
    store.textAnimStyle,
    store.baseColor,
    store.secondaryColor,
    store.accentColor,
    store.bgColor,
    store.bloomIntensity,
    store.rgbSplitAmount,
    store.distortion,
    store.glitchActive,
    store.speed,
    store.chaos,
    store.saturation,
    store.contrast,
    store.brightness,
    store.exposure,
    store.textInput,
    store.textReactive,
    store.textGlow,
    store.textSpeed,
    store.textFontSize,
    store.textFontWeight,
    store.textLetterSpacing,
    store.audioDriveMode,
    store.visualInputSource,
    store.isFullscreen,
    store.visualMemories,
  ]);

  useEffect(() => {
    clientRef.current?.publishState(patch);
  }, [patch]);

  if (!showStatus) return null;

  return (
    <>
      <div className="pointer-events-none fixed left-3 bottom-3 z-30 hidden rounded-full border border-white/10 bg-black/55 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/60 backdrop-blur md:block">
        Show API: {status}
      </div>
      <ShowRuntimeSettingsPanel status={status} />
    </>
  );
}

function applyVisualCommand(command: ControlCommand) {
  if (command.module && command.module !== 'visual' && command.module !== 'show') return;

  const state = useStore.getState();
  const value = command.value;

  if (command.command === 'setScene' && typeof value === 'string') {
    applyRemoteScene(value);
  } else if (command.command === 'setPreset' && typeof value === 'string') {
    applyRemotePreset(value);
  } else if (command.command === 'setText') {
    if (typeof value === 'string') {
      state.setTextEngine('textInput', value);
    } else if (isRecord(value)) {
      if (typeof value.value === 'string') state.setTextEngine('textInput', value.value);
      if (typeof value.animation === 'string') state.setTextEngine('textAnimStyle', value.animation);
      if (typeof value.reactive === 'number') state.setTextEngine('textReactive', value.reactive);
    }
  } else if (command.command === 'setColors' && isRecord(value)) {
    if (typeof value.base === 'string') state.setColorGrading('baseColor', value.base);
    if (typeof value.secondary === 'string') state.setColorGrading('secondaryColor', value.secondary);
    if (typeof value.accent === 'string') state.setColorGrading('accentColor', value.accent);
    if (typeof value.background === 'string') state.setColorGrading('bgColor', value.background);
  } else if (command.command === 'setFx' && isRecord(value)) {
    if (typeof value.bloomIntensity === 'number') state.setFxControl('bloomIntensity', value.bloomIntensity);
    if (typeof value.rgbSplitAmount === 'number') state.setFxControl('rgbSplitAmount', value.rgbSplitAmount);
    if (typeof value.distortion === 'number') state.setFxControl('distortion', value.distortion);
    if (typeof value.glitchActive === 'boolean') state.setFxControl('glitchActive', value.glitchActive);
    if (typeof value.speed === 'number') state.setPerformanceControl('speed', value.speed);
    if (typeof value.chaos === 'number') state.setPerformanceControl('chaos', value.chaos);
  } else if (command.command === 'setAudioDrive' && typeof value === 'string') {
    applyRemoteAudioDrive(value);
  } else if (command.command === 'setFullscreen') {
    state.setIsFullscreen(Boolean(value));
  } else if (command.command === 'setIntensity') {
    const amount = toNumber(value, state.chaos);
    state.setPerformanceControl('chaos', amount);
  }
}

function applyRemoteAudioDrive(value: string) {
  const state = useStore.getState();
  if (!['mic', 'music', 'api', 'hybrid'].includes(value)) return;

  const inputSource = (value === 'hybrid' ? 'api' : value) as VisualInputSource;
  window.dispatchEvent(new CustomEvent('vj:select-input', { detail: inputSource }));
  state.setAudioDriveMode(inputSource as AudioDriveMode);
}

function applyRemoteScene(scene: string) {
  const state = useStore.getState();
  const preset = scenePresetMap[scene];
  if (preset) state.applyPreset(preset);
  state.setCurrentScene(scene);
}

function applyRemotePreset(presetOrScene: string) {
  const state = useStore.getState();
  const preset = scenePresetMap[presetOrScene] || presetOrScene;
  state.applyPreset(preset);
  const scene = Object.entries(scenePresetMap).find(([, mappedPreset]) => mappedPreset === preset)?.[0];
  if (scene) state.setCurrentScene(scene);
}
