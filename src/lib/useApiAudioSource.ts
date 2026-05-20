import { useEffect, useRef } from 'react';
import { setRemoteAudioEnabled, setRemoteAudioSnapshot, type AudioDriveSnapshot } from '@/lib/audioDrive';

const API_ENDPOINT = '/api/spec';
const POLL_INTERVAL_MS = 33; // ~30fps

export function useApiAudioSource(enabled: boolean) {
  const intervalRef = useRef<number | null>(null);
  const lastFetchTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setRemoteAudioEnabled(false);
      return;
    }

    setRemoteAudioEnabled(true);

    const fetchAudioData = async () => {
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

        const now = performance.now();
        setRemoteAudioSnapshot(snapshot, data.syncedSignal ?? 0);
        lastFetchTimeRef.current = now;
      } catch (error) {
        console.warn('Failed to fetch audio data from API:', error);
      }
    };

    // Initial fetch
    void fetchAudioData();

    // Set up polling interval
    intervalRef.current = window.setInterval(fetchAudioData, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setRemoteAudioEnabled(false);
    };
  }, [enabled]);
}

/**
 * Normalize values to 0-1 range
 */
function normalizeValue(value: unknown, fallback: number = 0): number {
  if (typeof value !== 'number') return fallback;
  return Math.max(0, Math.min(1, value));
}
