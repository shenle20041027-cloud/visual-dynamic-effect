export type ScreenOwner = 'vj' | 'baofa' | 'off' | 'diagnostic';

export type ScreenRoute = {
  screenId: string;
  owner: ScreenOwner;
  url: string | null;
  updatedAt?: number;
  status?: string;
  source?: string;
};

const env = (import.meta as any).env || {};
export const SHOW_BACKEND_URL = String(env.VITE_SHOW_BACKEND_URL || 'http://localhost:4300').replace(/\/$/, '');
export const BAOFA_SCREEN_BASE_URL = 'http://localhost:4303/screen';

export const SHOW_SCREEN_IDS = [
  'A1',
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
  'C1', 'C2', 'C3', 'C4',
  'D1', 'D2', 'D3',
  'E1', 'F1',
  'L1', 'L2', 'R1', 'R2',
] as const;

export function getBaofaScreenUrl(screenId: string) {
  return `${BAOFA_SCREEN_BASE_URL}/${encodeURIComponent(screenId)}`;
}

export async function fetchScreenRoutes(signal?: AbortSignal): Promise<Record<string, ScreenRoute>> {
  const response = await fetch(`${SHOW_BACKEND_URL}/api/state`, { signal });
  if (!response.ok) throw new Error(`Show API state failed: ${response.status}`);
  const state = await response.json();
  return state?.modules?.interaction?.screenRoutes || {};
}
