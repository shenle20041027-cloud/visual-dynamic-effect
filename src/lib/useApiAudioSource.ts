import { useEffect, useRef } from 'react';
import { SHOW_BACKEND_URL, SHOW_WS_URL } from '@/lib/runtimeConfig';
import { setRemoteAudioEnabled, setRemoteAudioSnapshot, type AudioDriveSnapshot } from '@/lib/audioDrive';

const API_ENDPOINT = '/api/audio-summary';
const FALLBACK_POLL_INTERVAL_MS = 500;
const FALLBACK_STALE_MS = 250;

const env = (import.meta as any).env || {};
const backendUrl = SHOW_BACKEND_URL;
const wsUrl = SHOW_WS_URL;

export function useApiAudioSource(enabled: boolean) {
  const intervalRef = useRef<number | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const lastUpdateAtRef = useRef<number>(0);
  const clientIdRef = useRef(`vj-audio-drive-${createIdFragment()}`);

  useEffect(() => {
    let disposed = false;

    if (!enabled) {
      disposed = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
      socketRef.current?.close();
      socketRef.current = null;
      setRemoteAudioEnabled(false);
      return;
    }

    setRemoteAudioEnabled(true);
    lastUpdateAtRef.current = performance.now();

    const fetchAudioData = async () => {
      const now = performance.now();
      if (now - lastUpdateAtRef.current < FALLBACK_STALE_MS) {
        return;
      }

      try {
        const response = await fetch(API_ENDPOINT);
        if (!response.ok) {
          console.warn(`API responded with ${response.status}`);
          return;
        }
        const data = await response.json();
        
        // Transform API response to AudioDriveSnapshot
        const snapshot: Partial<AudioDriveSnapshot> = {
          volume: normalizeValue(data.volume),
          subBass: normalizeValue(data.subBass),
          bass: normalizeValue(data.bass),
          lowMid: normalizeValue(data.lowMid),
          mid: normalizeValue(data.mid),
          highMid: normalizeValue(data.highMid),
          treble: normalizeValue(data.treble),
          energy: normalizeValue(data.energy),
          beat: normalizeValue(data.beat),
          spectralCentroid: normalizeValue(data.spectralCentroid),
          spectralFlux: normalizeValue(data.spectralFlux),
          transient: normalizeValue(data.transient),
          dynamicRange: normalizeValue(data.dynamicRange),
        };

        setRemoteAudioSnapshot(snapshot, data.syncedSignal ?? 0);
        lastUpdateAtRef.current = now;
      } catch (error) {
        console.warn('Failed to fetch audio data from API:', error);
      }
    };

    const connectAudioStream = () => {
      if (disposed) return;

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.addEventListener('open', () => {
        socket.send(JSON.stringify({
          type: 'client.hello',
          clientId: clientIdRef.current,
          module: 'visual',
          role: 'audio-drive',
          capabilities: ['mixer.audioFrame', 'audio.drive'],
        }));
      });

      socket.addEventListener('message', (event) => {
        const parsed = parseWebSocketPayload(event.data);
        if (!parsed) return;

        const frame = parseMixerAudioFrame(parsed);
        if (!frame) return;

        setRemoteAudioSnapshot(frame.snapshot, frame.syncedSignal);
        lastUpdateAtRef.current = performance.now();
      });

      socket.addEventListener('close', () => {
        if (disposed) return;
        if (reconnectRef.current) {
          clearTimeout(reconnectRef.current);
        }
        reconnectRef.current = window.setTimeout(() => {
          if (!disposed) {
            connectAudioStream();
          }
        }, 1200);
      });

      socket.addEventListener('error', () => {
        socket.close();
      });
    };

    // Set up polling interval
    intervalRef.current = window.setInterval(() => {
      void fetchAudioData();
    }, FALLBACK_POLL_INTERVAL_MS);

    connectAudioStream();

    return () => {
      disposed = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
      socketRef.current?.close();
      socketRef.current = null;
      setRemoteAudioEnabled(false);
    };
  }, [enabled]);
}

function createIdFragment() {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? uuid.slice(0, 8) : Math.random().toString(36).slice(2, 10);
}

/**
 * Normalize values to 0-1 range
 */
function normalizeValue(value: unknown, fallback: number = 0): number {
  if (typeof value !== 'number') return fallback;
  return Math.max(0, Math.min(1, value));
}

function parseWebSocketPayload(data: unknown): unknown | null {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  return data;
}

function parseMixerAudioFrame(raw: unknown): { snapshot: Partial<AudioDriveSnapshot>; syncedSignal: number } | null {
  const source = findAudioFrameSource(raw);
  if (!source) return null;

  if (looksLikeMixerAudioFrame(source)) {
    const bands = extractFrequencyBands(source.frequencyBands);
    const level = normalizeValue(source.level);
    const rms = normalizeValue(source.rms);
    const peak = normalizeValue(source.peak);
    const beatValue = typeof source.beat === 'number' ? normalizeValue(source.beat) : source.speaking ? 1 : 0;

    return {
      snapshot: {
        volume: level,
        subBass: averageBands(bands, 0, 0),
        bass: averageBands(bands, 1, 2),
        lowMid: averageBands(bands, 3, 5),
        mid: averageBands(bands, 6, 8),
        highMid: averageBands(bands, 9, 11),
        treble: averageBands(bands, 12, 15),
        energy: rms,
        beat: normalizeValue(beatValue),
        spectralCentroid: averageBands(bands, 0, 15),
        spectralFlux: peak,
        transient: Math.max(0, peak - rms),
        dynamicRange: Math.min(1, peak / (rms || 0.01)),
      },
      syncedSignal: level,
    };
  }

  const snapshot = {
    volume: normalizeValue(source.volume),
    subBass: normalizeValue(source.subBass),
    bass: normalizeValue(source.bass),
    lowMid: normalizeValue(source.lowMid),
    mid: normalizeValue(source.mid),
    highMid: normalizeValue(source.highMid),
    treble: normalizeValue(source.treble),
    energy: normalizeValue(source.energy),
    beat: normalizeValue(source.beat),
    spectralCentroid: normalizeValue(source.spectralCentroid),
    spectralFlux: normalizeValue(source.spectralFlux),
    transient: normalizeValue(source.transient),
    dynamicRange: normalizeValue(source.dynamicRange),
  };

  return {
    snapshot,
    syncedSignal: normalizeValue(source.syncedSignal ?? source.syncedScreenSignal ?? source.signal ?? source.syncSignal ?? 0),
  };
}

function findAudioFrameSource(value: unknown, depth = 0): Record<string, unknown> | null {
  if (!isRecord(value) || depth > 3) return null;

  if (isMixerAudioFrameEnvelope(value)) {
    for (const key of ['payload', 'data', 'frame', 'audioFrame'] as const) {
      const nested = value[key];
      if (isRecord(nested)) {
        return findAudioFrameSource(nested, depth + 1) ?? nested;
      }
    }
    return value;
  }

  if (looksLikeAudioSnapshot(value)) {
    return value;
  }

  for (const key of ['payload', 'data', 'frame', 'audioFrame'] as const) {
    const nested = value[key];
    if (isRecord(nested)) {
      const source = findAudioFrameSource(nested, depth + 1);
      if (source) return source;
    }
  }

  return null;
}

function isMixerAudioFrameEnvelope(value: Record<string, unknown>) {
  return value.type === 'mixer.audioFrame' || value.event === 'mixer.audioFrame' || value.topic === 'mixer.audioFrame';
}

function looksLikeMixerAudioFrame(value: Record<string, unknown>) {
  return (
    isMixerAudioFrameEnvelope(value) ||
    typeof value.level === 'number' ||
    typeof value.rms === 'number' ||
    typeof value.peak === 'number' ||
    typeof value.speaking === 'boolean' ||
    value.frequencyBands !== undefined
  );
}

function looksLikeAudioSnapshot(value: Record<string, unknown>) {
  return [
    'volume',
    'subBass',
    'bass',
    'lowMid',
    'mid',
    'highMid',
    'treble',
    'energy',
    'beat',
    'spectralCentroid',
    'spectralFlux',
    'transient',
    'dynamicRange',
  ].some((key) => typeof value[key] === 'number');
}

function extractFrequencyBands(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeValue(entry));
  }

  if (!isRecord(value)) return [];

  if (typeof value.length === 'number') {
    const arrayLike = value as unknown as ArrayLike<unknown>;
    const bands: number[] = [];
    for (let index = 0; index < arrayLike.length; index += 1) {
      const entry = arrayLike[index];
      if (typeof entry === 'number') {
        bands.push(normalizeValue(entry));
      }
    }
    if (bands.length) return bands;
  }

  return Object.entries(value)
    .map(([key, entry]) => ({ index: Number(key), entry }))
    .filter(({ index, entry }) => Number.isInteger(index) && index >= 0 && typeof entry === 'number')
    .sort((left, right) => left.index - right.index)
    .map(({ entry }) => normalizeValue(entry));
}

function averageBands(bands: number[], start: number, end: number): number {
  const selected = bands.slice(start, end + 1);
  if (!selected.length) return 0;
  const total = selected.reduce((sum, value) => sum + value, 0);
  return normalizeValue(total / selected.length);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
